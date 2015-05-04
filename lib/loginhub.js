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

var api = {};
module.exports = api;

// FIXME: Move out into loginhub modules
// Database and routes

// On MongoDb being ready
bedrock.events.on('bedrock-mongodb.ready', function(callback) {
  database.openCollections(['CHT', 'DidDocuments'], function(err) {
    if(err) {
      return callback(err);
    }
    callback();
  });
});

bedrock.events.on('bedrock-express.configure.routes', function(app) {
  app.post('/credentials-request', function(req, res, next) {
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
          if(callerData.credential) {
            vars.credential = callerData.credential;
          }
        }
      } catch(e) {
        // TODO: handle this better perhaps
        return next(e);
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
  app.get('/mappings/:hash', function(req, res){
    //console.log('/DID req.query.hashQuery', req.query.hashQuery);
    database.collections.CHT.find({hash: req.params.hash})
    .toArray(function(err, docs){
      if(docs.length == 0){
        res.status(400).send('Invalid login info');
      }
      else{
        // send session id aka login the person
        //console.log('/DID response', docs[0].did);
        res.send(docs[0].did);
      }
    });
  });

  // TODO: validate params
  /*
   * params: did
   * return: idp
   */
  app.get('/did/idp', function(req, res){
    //console.log('/DID/Idp req.query', req.query);
    database.collections.DidDocuments.find({did:req.query.did})
    .toArray(function(err, docs){
      if(docs.length == 0){
        res.status(400).send('Invalid DID');
      }
      else{
       // console.log('/DID/Idp response', docs[0].document.idp);
        res.send(docs[0].document.idp);
      }
    });

  });

  app.post('/dids/', function(req, res) {
   // console.log(req.body);
    var loginHash = req.body.loginHash;
    var DID = req.body.DID;
    var DIDDoc = req.body.DIDDocument;
    var encryptedDID = req.body.EDID;

    var hashTaken = false;
    // checks if hash already exists in the database
    database.collections.CHT.find({hash: loginHash})
      .toArray(function(err, docs) {
        if(docs.length == 0) {
          database.collections.CHT.insert([{hash: loginHash, did: encryptedDID}]);
          database.collections.DidDocuments.insert([{did:DID, document:DIDDoc}]);
          res.status(201).send("Succesfully created user");
        }
        else {
          res.send("Failed to create user");
        }
      });
  });

  app.post('/did/idp', function(req, res) {
  	var DID = req.body.did;
  	var idp = req.body.idp;
  	database.collections.DidDocuments.update({did:DID},{$set:{'document.idp': idp}}, function(err,result){
  		if(err){
  			res.send("Invalid Did");
  		}
  		else {
  		  	res.send("Updated idp");
  		}
  	});
  });

  app.post('/did/public-key', function(req, res) {
    var DID = req.body.DID;
    var key = req.body.key;
    database.collections.DidDocuments.update({did:DID}, {$push: {'document.publicKeys': key}}, {upsert: false}, function(err, result){
      if(err){
        res.send("Could not add public key");
      }
      else{
        res.send("Added public key");
      }
    });
  });

  app.post('/did/login-hash', function(req, res) {
    var DID = req.body.DID;
    var loginHash = req.body.loginHash;

    database.collections.CHT.insert([{hash: loginHash, did: DID}]);

  });
});
