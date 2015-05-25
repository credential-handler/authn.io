/*
 * The module interface file for authorization.io.
 *
 * Copyright (c) 2015 The Open Payments Foundation. All rights reserved.
 */
var _ = require('lodash');
var async = require('async');
var bedrock = require('bedrock');
var database = require('bedrock-mongodb');
var forge = require('node-forge');
var views = require('bedrock-views');

require('bedrock-mail');
require('bedrock-express');
require('bedrock-docs');
require('bedrock-server');
require('bedrock-requirejs');

// require default config
require('./config');

// alias for bedrock error
var BedrockError = bedrock.util.BedrockError;
var logger = bedrock.loggers.get('app');

var api = {};
module.exports = api;

// FIXME: Temporary IdP keypair
var gIdPKeypair = null;

// FIXME: Move out into authorization.io modules
// Database and routes

// On MongoDb being ready
bedrock.events.on('bedrock-mongodb.ready', function(callback) {
    // do initialization work
  async.waterfall([
    function(callback) {
      database.openCollections(['mapping', 'didDocument'], callback);
    }, function(callback) {
      database.createIndexes([{
        collection: 'mapping',
        fields: {id: 1},
        options: {unique: true, background: false}
      }, {
        collection: 'didDocument',
        fields: {id: 1},
        options: {unique: true, background: false}
      }], callback);
  }, function(callback) {
    // FIXME: Remove temporary IdP DID document
    callback(); // don't wait for key generation to complete (race condition)
    gIdPKeypair = forge.pki.rsa.generateKeyPair({bits: 1024});
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
    }, _.assign({}, database.writeOptions, {upsert:true, multi:false}),function(err, doc) {
      if(err) {
        console.log("Failed to set temporary IdP document:", err, doc);
      }
    });
  }], callback);
});

bedrock.events.on('bedrock-express.configure.routes', function(app) {
  app.get('/idp-redirect/', function(req, res, next) {
    console.log(req.body);
  });
  app.get('/cc-redirect/', function(req, res, next) {
    console.log(req.body);
  });
  app.get('/', function(req, res, next) {
    res.render('index.html');
  });

  /** Renders the credential consumer page on the relying party form post */
  app.post('/cc', function(req, res, next) {
    views.getDefaultViewVars(req, function(err, vars) {
      if(err) {
        return next(err);
      }
      res.render('index.html', vars);
    });
  });

  /** Renders the idp.html page on the idp form post */
  app.post('/idp', function(req, res, next) {
     views.getDefaultViewVars(req, function(err, vars) {
      if(err) {
        return next(err);
      }
      res.render('index.html', vars);
    });
  });

  /**
    This route handles redirecting a credential request
    to an idp in order to have credentials reviewed.
    A user logs in through this route and their callback is saved
    under a unique id stored in sessionStorage and the unique id
    along with the credentials being requested is then posted to
    the IDP associated with this user.
    Leads to 'idp.html' acceptCredentials function.

    @param callback
      url to post back to Credential Consumer
    @param credential
      credentials being requested from the credential consumer
  */
  app.post('/credentials-request', function(req, res, next) {
    console.log('req.cookies', req.cookies, req.body);
    var request = null;
    try {
      if(req.body.jsonPostData) {
        request = JSON.parse(req.body.jsonPostData);
      }
    } catch(e) {
      return next(e);
    }

    // user is logged in
    if(req.cookies.session && request.credential) {
      var sessionData = JSON.parse(req.cookies.session);
      var url = '/idp-redirect?idp=' + sessionData.idp.url;
      var request = JSON.parse(req.body.jsonPostData);
      if(request.callback) {
        url += '&callback=' + request.callback;
      }
      if(request.credential) {
        url += '&credential=' + request.credential.type;
      }
      return res.redirect(url);
    }

    // user is not logged in
    views.getDefaultViewVars(req, function(err, vars) {
      if(err) {
        return next(err);
      }
      if(request) {
        vars.request = request;
      }
      res.render('index.html', vars);
    });
  });

  app.post('/create-identity', function(req, res, next) {
    views.getDefaultViewVars(req, function(err, vars) {
      if(err) {
        return next(err);
      }
      try {
        if(req.body.jsonPostData) {
          var request = JSON.parse(req.body.jsonPostData);
          if(request.registrationCallback) {
            vars.registrationCallback = request.registrationCallback;
          }
          if(request.idp) {
            vars.idp = request.idp;
          }
        }
      } catch(e) {
        // TODO: handle this better perhaps
        return next(e);
      }
      res.render('index.html', vars);
    });
  });

  // TODO: validate params
  /**
   * Gets a mapping document given a hash.
   *
   * @param hash a properly formed urn:sha256 value.
   *
   * @return a mapping document.
   */
  app.get('/mappings/:hash', function(req, res, next) {
    database.collections.mapping.findOne(
      {id: req.params.hash}, function(err, document) {
      if(err) {
        logger.error('Mongo error when trying to find mapping.', err);
        return next(new BedrockError(
          'Failed to find mapping due to internal error.',
          'MappingLookupFailed',
          {hash: req.params.hash, httpStatusCode: 500, 'public': true}));
      }
      if(!document) {
        return next(new BedrockError(
          'Failed to find mapping for the provided \'hash\'.',
          'MappingLookupFailed',
          {hash: req.params.hash, httpStatusCode: 404, 'public': true}));
      }

      // respond with the appropriate document
      res.set('Content-Type', 'application/ld+json');
      res.status(200);
      delete document._id;
      res.json(document);
    });
  });

  // TODO: validate params
  /**
   * Gets a DID document given a DID.
   *
   * @param did the DID URI to fetch.
   *
   * @return a DID document.
   */
  app.get('/dids/:did', function(req, res, next) {
    database.collections.didDocument.findOne(
      {id: req.params.did}, function(err, document) {
      if(err) {
        logger.error('Mongo error when trying to find DID document.', err);
        return next(new BedrockError(
          'Failed to find DID document due to internal error.',
          'DidDocumentLookupFailed',
          {did: req.params.did, httpStatusCode: 500, 'public': true}));
      }
      if(!document) {
        return next(new BedrockError(
          'Failed to find DID document for the provided DID.',
          'DidLookupFailed',
          {did: req.params.did, httpStatusCode: 404, 'public': true}));
      }

      // respond with the appropriate document
      res.set('Content-Type', 'application/ld+json');
      res.status(200);
      delete document._id;
      res.json(document);
    });
  });

  // TODO: validate params
  /*  /mappings/dids/:did
   * params: did
   * return: idp
   */
  app.get('/did/idp', function(req, res) {
    //console.log('/DID/Idp req.query', req.query);
    database.collections.didDocument.findOne({id:req.query.did})
    .toArray(function(err, docs) {
      if(docs.length === 0) {
        res.status(400).send('Invalid DID');
      } else {
       // console.log('/DID/Idp response', docs[0].document.idp);
        res.send(docs[0].document.idp);
      }
    });
  });

  // registers a mapping to a piece of data
  app.post('/mappings/', function(req, res, next) {
    // TODO: Ensure only 'urn:sha256:xxxx' values are allowed for id
    // TODO: Check proof of work before allowing storage.
    var mapping = {
      '@context': req.body['@context'],
      id: req.body.id,
      did: req.body.did,
      accessControl: req.body.accessControl
    };

    // attempt to insert the mapping
    database.collections.mapping.insert(
      mapping, database.writeOptions, function(err) {
      if(err) {
        logger.error('Mongo error when trying to create mapping.', err);
        return next(new BedrockError(
          'Failed to create mapping for the provided \'id\'.',
          'MappingStorageFailed',
        {id: req.body.id, httpStatusCode: 500, 'public': true}));
      }

      // the mapping was stored successfully
      res.set('Location', 'https://authorization.io/mappings/' + req.body.id);
      res.status(201);
      res.send();
    });
  });

  // registers a hash to an encrypted blob and a did to a didDocument
  app.post('/dids/', function(req, res, next) {
    console.log(req.body);
    var did = req.body.id;
    var idp = req.body.idp;
    var accessControl = req.body.accessControl;
    var publicKeys = req.body.publicKey;

    var didDocument = {
      '@context': 'https://w3id.org/identity/v1',
      id: did,
      idp: idp,
      accessControl: accessControl,
      publicKey: publicKeys
    };

    // insert the DID document into the database
    // TODO:
    database.collections.didDocument.insert(
      didDocument, database.writeOptions, function(err) {
      if(err) {
        logger.error('Mongo error when trying to write DID document.', err);
        return next(new BedrockError(
          'Failed to store DID document the provided \'id\'.',
          'DidDocumentStorageFailed',
        {id: req.body.id, httpStatusCode: 500, 'public': true}));
      }

      // the DID was stored successfully
      res.set('Location', 'https://authorization.io/dids/' + req.body.id);
      res.status(201);
      res.send();
    });
  });

  app.post('/did/idp', function(req, res) {
    var DID = req.body.did;
    var idp = req.body.idp;
    database.collections.didDocument.update(
      {did:DID},{$set:{'document.idp': idp}}, function(err, result) {
      if(err) {
       res.send("Invalid Did");
      } else {
       res.send("Updated idp");
      }
    });
  });

  app.post('/did/public-key', function(req, res) {
    var DID = req.body.DID;
    var key = req.body.key;
    database.collections.didDocument.update(
      {did:DID},
      {$push: {'document.publicKeys': key}},
      {upsert: false},
      function(err, result) {
      if(err) {
        res.send("Could not add public key");
      } else {
        res.send("Added public key");
      }
    });
  });

  app.post('/did/login-hash', function(req, res) {
    var DID = req.body.DID;
    var loginHash = req.body.loginHash;
    database.collections.mapping.insert([{hash: loginHash, did: DID}]);
  });

  /**
    Redirects approved credentials to the credential consumer associated
    with the user. Renders credentials-approve.html to do this.
    This route posts to the callback that was initially sent in to /credentials-request.

    @param id
      expects the id that maps to the credential consumer's callback in sessionStorage
    @param credential
      expects the credentials document from the IDP
  */
  app.post('/credentials-approve', function(req, res, next) {
    var request = JSON.parse(req.body.jsonPostData);
    views.getDefaultViewVars(req, function(err, vars) {
      if(err) {
        return next(err);
      }
      if(request && request.credentials) {
        vars.credentials = request.credentials;
      }
      res.render('index.html', vars);
    });
  });
});
