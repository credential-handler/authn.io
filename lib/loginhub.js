/*
 * The module interface file for Loginhub.
 *
 * Copyright (c) 2015 The Open Payments Foundation. All rights reserved.
 */
var bedrock = require('bedrock');
var database = require('bedrock-mongodb');
var views = require('bedrock-views');

require('bedrock-mail');
require('bedrock-express');
require('bedrock-docs');
require('bedrock-server');

// require default config
require('./config');

// alias for bedrock error
var BedrockError = bedrock.util.BedrockError;
var logger = bedrock.loggers.get('app');

var api = {};
module.exports = api;

// FIXME: Move out into loginhub modules
// Database and routes

// On MongoDb being ready
// TODO: rename db names (camelCase) CHT->mappings
bedrock.events.on('bedrock-mongodb.ready', function(callback) {
  database.openCollections(['CHT', 'DidDocuments'], function(err) {
    if(err) {
      return callback(err);
    }
    callback();
  });
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

  /** Renders the cc.html page on the cc form post */
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
    console.log('req.cookies', req.cookies);
    try {
      if(req.body.callerData) {
        var callerData = JSON.parse(req.body.callerData);
      }
    } catch(e) {
      return next(e);
    }

    // user is logged in
    if(req.cookies.session && callerData.credential) {
      var sessionData = JSON.parse(req.cookies.session);
      var url = '/idp-redirect?idp=' + sessionData.idp.url;
      var callerData = JSON.parse(req.body.callerData);
      if(callerData.callback) {
        url += '&callback=' + callerData.callback;
      }
      if(callerData.credential) {
        url += '&credential=' + callerData.credential.type;
      }
      return res.redirect(url);
    }

    // user is not logged in
    views.getDefaultViewVars(req, function(err, vars) {
      if(err) {
        return next(err);
      }
      if(callerData) {
        if(callerData.callback) {
          vars.callback = callerData.callback;
        }
        if(callerData.credential) {
          vars.credential = callerData.credential;
        }
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
        if(req.body.callerData) {
          var callerData = JSON.parse(req.body.callerData);
          if(callerData.callback) {
            vars.callback = callerData.callback;
          }
          if(callerData.idp) {
            vars.idp = callerData.idp;
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
  /*
   * params: login hash
   * return: did
   */
  app.get('/mappings/:hash', function(req, res) {
    //console.log('/DID req.query.hashQuery', req.query.hashQuery);
    database.collections.CHT.find({hash: req.params.hash})
    .toArray(function(err, docs) {
      if(docs.length === 0) {
        res.status(400).send('Invalid login info');
      } else {
        // send session id aka login the person
        //console.log('/DID response', docs[0].did);
        res.send(docs[0].did);
      }
    });
  });

  // TODO: validate params
  /*  /mappings/dids/:did
   * params: did
   * return: idp
   */
  app.get('/did/idp', function(req, res) {
    //console.log('/DID/Idp req.query', req.query);
    database.collections.DidDocuments.find({did:req.query.did})
    .toArray(function(err, docs) {
      if(docs.length === 0) {
        res.status(400).send('Invalid DID');
      } else {
       // console.log('/DID/Idp response', docs[0].document.idp);
        res.send(docs[0].document.idp);
      }
    });
  });

  // registers a hash to an encrypted blob and a did to a didDocument
  app.post('/dids/', function(req, res, next) {
    // console.log(req.body);
    // FIXME: fix variable names
    var loginHash = req.body.loginHash;
    var DID = req.body.DID;
    var DIDDoc = req.body.DIDDocument;
    var encryptedDID = req.body.EDID;

    // checks if hash already exists in the database
    // TODO: race condition when finding and inserting (unique index on hash)
    // move insert here
    database.collections.CHT.find({hash: loginHash})
      .toArray(function(err, docs) {
        if(err) {
          logger.error('Mongo error when trying to create mapping.', err);
          return next(new BedrockError(
            'Failed to create mapping for the provided hash.',
            'HashMappingFailed',
            {hash: loginHash, httpStatusCode: 500, 'public': true}));
        }
        if(docs.length > 0) {
          return next(new BedrockError(
            'The provided hash already has a mapping.',
            'HashMappingExists',
            {hash: loginHash, httpStatusCode: 409, 'public': true}));
        }
        // TODO: check to make sure inserts succeeded
        database.collections.CHT.insert(
          [{hash: loginHash, did: encryptedDID}]);
        database.collections.DidDocuments.insert(
          [{did:DID, document:DIDDoc}]);

        // TODO: set location
        res.set('Location', 'https://loginhub.com/mappings/:hash');
        res.status(201);
        res.send();
      });
  });

  app.post('/did/idp', function(req, res) {
    var DID = req.body.did;
    var idp = req.body.idp;
    database.collections.DidDocuments.update(
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
    database.collections.DidDocuments.update(
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
    database.collections.CHT.insert([{hash: loginHash, did: DID}]);
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
    var callerData = JSON.parse(req.body.callerData);
    views.getDefaultViewVars(req, function(err, vars) {
      if(err) {
        return next(err);
      }
      if(callerData && callerData.credentials) {
        vars.credentials = callerData.credentials;
      }
      res.render('index.html', vars);
    });
  });
});
