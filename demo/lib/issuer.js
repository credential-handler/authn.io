/*
 * The module interface file for a mock issuer.
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

// mock issuer keypair
var gIssuerKeypair = null;

var _did = 'did:1s1s1s1s-1s1s-1s1s-1s1s-1s1s1s1s1s1s';

bedrock.events.on('bedrock-mongodb.ready', function(callback) {
  async.waterfall([
    function(callback) {
      database.openCollections(['didDocument'], callback);
    },
    function(callback) {
      // insert the mock IdP DID document
      gIssuerKeypair = forge.pki.rsa.generateKeyPair({bits: 512});
      var now = Date.now();
      var idHash = database.hash(_did);
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
          id: _did,
          accessControl: {
            writePermission: [{
              id: _did + '/keys/1',
              type: 'CryptographicKey'
            }]
          },
          publicKey: [{
            id : _did + '/keys/1',
            type: 'CryptographicKey',
            owner: _did,
            publicKeyPem: forge.pki.publicKeyToPem(gIssuerKeypair.publicKey)
          }]
        }
      }, _.assign({}, database.writeOptions, {upsert:true, multi:false}),
        function(err, doc) {
        if(err) {
          console.log('Failed to set issuer document:', err, doc);
        }
        callback();
      });
    }], callback);
});

bedrock.events.on('bedrock-express.configure.routes', function(app) {
  // mock issuer credentials generator
  app.post('/issuer/credentials', function(req, res, next) {
    var privateKeyPem =
      forge.pki.privateKeyToPem(gIssuerKeypair.privateKey);
    var targetDid = req.cookies.did;
    var identity = {
      '@context': 'https://w3id.org/identity/v1',
      id: targetDid,
      credential: {}
    };
    var credentials = req.body.credential;

    // sign each credential
    async.map(credentials, function(item, callback) {
      jsigs.sign(item['@graph'], {
        privateKeyPem: privateKeyPem,
        creator: config.server.baseUri + '/issuer/keys/1'
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
      res.set('Content-Type', 'application/ld+json');
      res.status(200).json(identity);
    });
  });
});
