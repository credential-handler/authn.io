/*
 * The module interface file for a mock identity provider.
 *
 * Copyright (c) 2015 The Open Payments Foundation. All rights reserved.
 */
var _ = require('lodash');
var async = require('async');
var bedrock = require('bedrock');
var bodyParser = require('body-parser');
var config = require('bedrock').config;
var database = require('bedrock-mongodb');
var forge = require('node-forge');
var views = require('bedrock-views');
var jsigs = require('jsonld-signatures');

// mock IdP keypair
var gIdPKeypair = null;

// mock credential store
var gCredentials = {};

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
  // parse application/x-www-form-urlencoded
  var parseForm = bodyParser.urlencoded({extended: false});

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
        '/idp/credentials'
    };
    res.type('application/json');
    res.send(endpoints);
  });

  // mock IdP credential approval page
  app.post('/idp/credentials', parseForm, function(req, res, next) {
    views.getDefaultViewVars(req, function(err, vars) {
      if(err) {
        return next(err);
      }

      vars.idp = {};
      vars.idp.identity = {
        '@context': 'https://w3id.org/identity/v1',
        id: '',
        type: '',
        credential: {}
      };
      if(req.query.action === 'request') {
        // generate a fake credential
        vars.idp.identity.credential = gCredentials[req.cookies.did];
        vars.idp.identity.type = 'Identity';
        vars.idp.identity.id =
          vars.idp.identity.credential[0]['@graph'].claim.id;

        // extract the credential callback URL
        vars.idp.credentialCallbackUrl = req.query.credentialCallback;

        // add a new credential for the public key
        var credQuery = {};
        try {
          credQuery = JSON.parse(req.body.jsonPostData);
        } catch(err) {
          console.log('Error: Failed to extract credential query:', err);
        }
        vars.query = credQuery.query;
        if(credQuery.publicKey) {
          var publicKeyCredential = {
            '@context': [
              'https://w3id.org/identity/v1',
              'https://w3id.org/credentials/v1'
            ],
            type: [
              'Credential',
              'sec:CryptographicKeyCredential'
            ],
            claim: {
              id: vars.idp.identity.id,
              publicKey: credQuery.publicKey
            }
          };

          // sign the public key credential
          jsigs.sign(publicKeyCredential, {
            privateKeyPem: forge.pki.privateKeyToPem(gIdPKeypair.privateKey),
            creator: config.server.baseUri + '/idp/keys/1'
          }, function(err, signedPublicKeyCredential) {
            if(!err) {
              vars.idp.identity.credential.push({
                '@graph': signedPublicKeyCredential
              });
            }
            res.render('main.html', vars);
            // remove temporary key credential
            vars.idp.identity.credential.pop();
          });
        } else {
          res.render('main.html', vars);
        }
      } else if(req.query.action === 'store') {
        try {
          if(req.body.jsonPostData) {
            vars.idp.identity = JSON.parse(req.body.jsonPostData);
          }
          // extract the storage callback URL
          vars.idp.storageCallbackUrl = req.query.storageCallback;
        } catch(e) {
          return next(e);
        }
        res.render('main.html', vars);
      } else {
        var identity = req.body;

        // store the identity
        if(identity) {
          var privateKeyPem =
            forge.pki.privateKeyToPem(gIdPKeypair.privateKey);
          var credentials = identity.credential;

          // ensure that each credential is signed
          async.map(credentials, function(item, callback) {
            if(item['@graph'].signature) {
              return callback(null, item);
            }

            // sign the credential if it doesn't already have a signature
            jsigs.sign(item['@graph'], {
              privateKeyPem: privateKeyPem,
              creator: config.server.baseUri + '/idp/keys/1'
            }, function(err, signedCredential) {
              if(err) {
                return callback(err);
              }
              callback(null, {
                '@graph': signedCredential
              });
            });
          }, function(err, results) {
            if(err) {
              return next(err);
            }
            identity.credential = results;
            _mergeCredentials(identity);
            res.sendStatus(200);
          });
        }
      }
    });
  });

  /**
   * Merge the given credentials with the credentials in the database.
   *
   * @param identity the identity to take the credentials from.
   */
  function _mergeCredentials(identity) {
    if(!gCredentials[identity.id]) {
      gCredentials[identity.id] = [];
    }
    gCredentials[identity.id] =
      _.union(gCredentials[identity.id], identity.credential);
  }

});