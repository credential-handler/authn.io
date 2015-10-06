/*
 * The module interface file for a mock identity provider.
 *
 * Copyright (c) 2015 The Open Payments Foundation. All rights reserved.
 */
var _ = require('lodash');
var async = require('async');
var bedrock = require('bedrock');
var config = require('bedrock').config;
var database = require('bedrock-mongodb');
var forge = require('node-forge');
var jsigs = require('jsonld-signatures');
var uuid = require('node-uuid');

// mock IdP keypair
var gIdPKeypair = null;

bedrock.events.on('bedrock-mongodb.ready', function(callback) {
  async.waterfall([
    function(callback) {
      database.openCollections(['didDocument'], callback);
    },
    function(callback) {
      // insert the mock IdP DID document
      gIdPKeypair = forge.pki.rsa.generateKeyPair({bits: 512});
      var now = Date.now();
      var id = 'did:d1d1d1d1-d1d1-d1d1-d1d1-d1d1d1d1d1d1';
      var idHash = database.hash(id);
      database.collections.didDocument.update({
        id: idHash
      }, {
        id: idHash,
        meta: {
          created: now,
          updated: now
        },
        didDocument: {
          '@context': 'https://w3id.org/identity/v1',
          id: id,
          url: config.server.baseUri + '/idp',
          accessControl: {
            writePermission: [{
              id: id + '/keys/1',
              type: 'CryptographicKey'
            }]
          },
          publicKey: [{
            id: id + '/keys/1',
            type: 'CryptographicKey',
            owner: id,
            publicKeyPem: forge.pki.publicKeyToPem(gIdPKeypair.publicKey)
          }]
        }
      }, _.assign({}, database.writeOptions, {upsert: true, multi: false}),
        function(err, doc) {
        if(err) {
          console.log('Failed to set IdP document:', err, doc);
          return callback(err);
        }
        callback();
      });
    }], callback);
});

bedrock.events.on('bedrock-express.configure.routes', function(app) {
  // TODO: change to serve this on "/idp" when JSON-LD is requested
  // identity credentials end points
  app.get('/idp/.well-known/identity', function(req, res) {
    // TODO: move entire document to config system
    var endpoints = {
      '@context': {
        credentialsRequestUrl:
          'https://w3id.org/identity#credentialsRequestUrl',
        storageRequestUrl: 'https://w3id.org/identity#storageRequestUrl',
        credentialManagementUrl:
          'https://w3id.org/identity#credentialManagementUrl'
      },
      /*credentialsRequestUrl: config.server.baseUri +
        '/idp/credentials?action=request',
      storageRequestUrl: config.server.baseUri +
        '/idp/credentials?action=store',*/
      credentialManagementUrl: config.server.baseUri +
        '/idp/credential-manager'
    };
    res.type('application/json');
    res.send(endpoints);
  });

  // mock IdP credential route to get a signed public key credential
  app.post('/idp/credentials/public-key', function(req, res, next) {
    var did = req.cookies.did;
    if(!did) {
      return next(new Error('Not authenticated. Please restart demo.'));
    }
    var identity = {
      '@context': 'https://w3id.org/identity/v1',
      id: did,
      type: 'Identity',
      credential: []
    };

    // validate public key
    var publicKey = req.body;
    if(publicKey.owner !== did) {
      return next(new Error('Permission denied.'));
    }

    // generate public key credential
    var publicKeyCredential = {
      '@context': [
        'https://w3id.org/identity/v1',
        'https://w3id.org/credentials/v1'
      ],
      id: 'urn:uuid:' + uuid.v4(),
      type: [
        'Credential',
        'sec:CryptographicKeyCredential'
      ],
      claim: {
        id: did,
        publicKey: publicKey
      }
    };
    jsigs.sign(publicKeyCredential, {
      privateKeyPem: forge.pki.privateKeyToPem(gIdPKeypair.privateKey),
      creator: config.server.baseUri + '/idp/keys/1'
    }, function(err, signed) {
      if(err) {
        return next(err);
      }
      identity.credential.push({
        '@graph': signed
      });
      res.status(200).json(identity);
    });
  });

  // mock IdP credential route to get signed email credentials
  app.post('/idp/credentials/email', function(req, res, next) {
    var did = req.cookies.did;
    if(!did) {
      return next(new Error('Not authenticated. Please restart demo.'));
    }
    var identity = {
      '@context': 'https://w3id.org/identity/v1',
      id: did,
      type: 'Identity',
      credential: []
    };

    // validate public key
    var view = req.body;
    if(view.id !== did) {
      return next(new Error('Permission denied.'));
    }

    var credentials = [];
    async.eachSeries(view.credential, function(credential, callback) {
      credential = credential['@graph'];
      if(credential.claim.id !== did) {
        return callback(new Error('Permission denied.'));
      }
      credential.id = 'urn:uuid:' + uuid.v4();
      jsigs.sign(credential, {
        privateKeyPem: forge.pki.privateKeyToPem(gIdPKeypair.privateKey),
        creator: config.server.baseUri + '/idp/keys/1'
      }, function(err, signed) {
        if(err) {
          return callback(err);
        }
        credentials.push({
          '@graph': signed
        });
        callback();
      });
    }, function(err) {
      if(err) {
        return next(err);
      }
      identity.credential = credentials;
      res.status(200).json(identity);
    });
  });
});
