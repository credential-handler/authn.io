/*
 * The module interface file for a mock identity provider.
 *
 * Copyright (c) 2015 The Open Payments Foundation. All rights reserved.
 */
var _ = require('lodash');
var async = require('async');
var bedrock = require('bedrock');
var database = require('bedrock-mongodb');
var forge = require('node-forge');
var views = require('bedrock-views');

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
      database.collections.didDocument.update({
        id: 'did:d1d1d1d1-d1d1-d1d1-d1d1-d1d1d1d1d1d1'
      }, {
        '@context': 'https://w3id.org/identity/v1',
        id: 'did:d1d1d1d1-d1d1-d1d1-d1d1-d1d1d1d1d1d1',
        credentialsRequestUrl: 'https://authorization.dev:33443/idp/credentials',
        accessControl: {
          writePermission: [{
            id: 'did:d1d1d1d1-d1d1-d1d1-d1d1-d1d1d1d1d1d1/keys/1',
            type: 'CryptographicKey'
          }]
        },
        publicKey: [{
          id : 'did:d1d1d1d1-d1d1-d1d1-d1d1-d1d1d1d1d1d1/keys/1',
          type: 'CryptographicKey',
          owner: 'did:d1d1d1d1-d1d1-d1d1-d1d1-d1d1d1d1d1d1',
          publicKeyPem: forge.pki.publicKeyToPem(gIdPKeypair.publicKey)
        }]
      }, _.assign({}, database.writeOptions, {upsert:true, multi:false}),
        function(err, doc) {
        if(err) {
          console.log('Failed to set IdP document:', err, doc);
        }
        callback();
      });
    }], callback);
});

bedrock.events.on('bedrock-express.configure.routes', function(app) {
  // mock IdP landing page
  app.post('/idp', function(req, res, next) {
    views.getDefaultViewVars(req, function(err, vars) {
      if(err) {
        return next(err);
      }
      res.render('index.html', vars);
    });
  });

  // mock IdP credential approval page
  app.post('/idp/credentials', function(req, res, next) {
    views.getDefaultViewVars(req, function(err, vars) {
      if(err) {
        return next(err);
      }

      console.log("req.query", req.query);

      // generate a fake credential
      vars.idp = {};
      vars.idp.identity = {
        '@context': 'https://w3id.org/identity/v1',
        id: 'did:238947293847932874928374',
        email: 'foo@example.com',
        credential: [{
          id: 'https://authorization.dev:33433/credential/8273',
          type: 'EmailCredential',
          claim: {
            id: 'did:238947293847932874928374',
            email: 'foo@example.com'
          },
          expires: '2017-02-04',
          signature: {
             type: 'GraphSignature2015',
             creator: 'https://authorization.dev:33433/keys/8',
             signature: 'XXXXXXXXXXXXXXXXXXX'
          }
        }]
      };

      // extract the callback URL
      vars.idp.credentialCallbackUrl = req.query.credentialCallback;

      res.render('idp/credentials.html', vars);
    });
  });

});
