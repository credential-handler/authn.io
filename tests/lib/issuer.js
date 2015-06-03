/*
 * The module interface file for a mock issuer.
 *
 * Copyright (c) 2015 The Open Payments Foundation. All rights reserved.
 */
var _ = require('lodash');
var async = require('async');
var bedrock = require('bedrock');
var database = require('bedrock-mongodb');
var forge = require('node-forge');
var views = require('bedrock-views');

// mock issuer keypair
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
        id: 'did:1s1s1s1s-1s1s-1s1s-1s1s-1s1s1s1s1s1s'
      }, {
        '@context': 'https://w3id.org/identity/v1',
        id: 'did:1s1s1s1s-1s1s-1s1s-1s1s-1s1s1s1s1s1s',
        accessControl: {
          writePermission: [{
            id: 'did:1s1s1s1s-1s1s-1s1s-1s1s-1s1s1s1s1s1s/keys/1',
            type: 'CryptographicKey'
          }]
        },
        publicKey: [{
          id : 'did:1s1s1s1s-1s1s-1s1s-1s1s-1s1s1s1s1s1s/keys/1',
          type: 'CryptographicKey',
          owner: 'did:1s1s1s1s-1s1s-1s1s-1s1s-1s1s1s1s1s1s',
          publicKeyPem: forge.pki.publicKeyToPem(gIdPKeypair.publicKey)
        }]
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
    views.getDefaultViewVars(req, function(err, vars) {
      if(err) {
        return next(err);
      }
      res.set('Content-Type', 'application/ld+json');
      res.status(200).json({});
    });
  });

  // mock issuer credentials dashboard
  app.get('/issuer/dashboard', function(req, res, next) {
    views.getDefaultViewVars(req, function(err, vars) {
      if(err) {
        return next(err);
      }

      try {
        if(req.cookies.issuer) {
          var issuer = JSON.parse(req.cookies.issuer);
          if(issuer) {
            vars.issuer = issuer;
          }
        }
      } catch(e) {
        return next(e);
      }

      res.render('issuer/credentials.html', vars);
    });
  });

  // mock issuer credentials dashboard login
  app.post('/issuer/dashboard', function(req, res, next) {
    views.getDefaultViewVars(req, function(err, vars) {
      if(err) {
        return next(err);
      }

      try {
        if(req.body.jsonPostData) {
          var jsonPostData = JSON.parse(req.body.jsonPostData);
          if(jsonPostData) {
            vars.issuer = {};
            vars.issuer.identity = jsonPostData;
          }
        }
      } catch(e) {
        return next(e);
      }

      res.cookie('issuer', JSON.stringify(vars.issuer));
      res.render('issuer/credentials.html', vars);
    });
  });

});
