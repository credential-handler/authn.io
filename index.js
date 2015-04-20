var bedrock = require('bedrock');
var path = require("path");
var database = require('bedrock-mongodb');

require('bedrock-express');
require('bedrock-requirejs');
require('bedrock-server');
var views = require('bedrock-views');

// custom configuration
bedrock.config.mongodb.name = 'login_hub_dev'; // default: bedrock_dev
bedrock.config.mongodb.host = 'localhost';      // default: localhost
bedrock.config.mongodb.port = 27017;            // default: 27017
bedrock.config.mongodb.username = 'login_hub'; // default: bedrock
bedrock.config.mongodb.password = 'password';   // default: password

// Bower Front End Configurations

bedrock.config.views.paths.push(
  path.join(__dirname)
);

bedrock.config.views.routes.push(['/*', 'index.html']);

// add pseudo bower package
bedrock.config.requirejs.bower.packages.push({
  path: path.join(__dirname, 'components'),
  manifest: {
    name: 'components',
    moduleType: 'amd',
    main: './main.js',
    dependencies: {
      angular: '~1.3.0'
    }
  }
});

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
  app.post('/', function(req, res, next) {
    views.getDefaultViewVars(req, function(err, vars) {
      if(err) {
        return next(err);
      }
      try {
        vars.credentialsQuery = JSON.parse(req.body.query);
      } catch(e) {
        // TODO: handle this better perhaps
        return next(e);
      }
      res.render('index.html', vars);
    });
  });

  app.post('/createDID', function(req, res, next) {
    views.getDefaultViewVars(req, function(err, vars) {
      if(err) {
        return next(err);
      }
      try {
        console.log('req.body', req.body);
        vars.idpInfo = JSON.parse(req.body.idpInfo);
      } catch(e){
        return next(e);
      }
      res.render('index.html', vars);
    });
  });

  //
  app.post('/DIDquery', function(req, res){
    console.log(req.body);
    database.collections.CHT.find({hash: req.body.hashQuery})
    .toArray(function(err, docs){
      if(docs.length == 0){
        res.send('Invalid login info');
        /*var userDID = 'did:' + bedrock.util.uuid();
        database.collections.CHT.insert([{hash: req.body.hashQuery, did: userDID}]);
        res.send(userDID);*/
      }
      else{
        // send session id aka login the person
        res.send(docs[0].did);
      }
    });
  });

  // Called from idps to create a new did or send an error that they cannot create it
  /*app.post('/newDID', function() {
    // post data contains idp information
    console.log(req.body);

    database.collections.CHT.find({hash: req.body.hashQuery})
    .toArray(function(err, docs){
      if(docs.length == 0){
        var userDID = 'did:' + bedrock.util.uuid();
        database.collections.CHT.insert([{hash: req.body.hashQuery, did: userDID}]);
        res.send({did:userDID, result:'good'});
      }
      else{
        res.send({result:'taken'});
      }
    });
  });*/

  app.post('/storeDID', function(req, res) {
    console.log(req.body);
    var loginHash = req.body.loginHash;
    var DID = req.body.DID;
    var DIDDoc = req.body.DIDDocument;

    var hashTaken = false;
    // checks if hash already exists in the database
    database.collections.CHT.find({hash: loginHash})
      .toArray(function(err, docs) {
        if(docs.length == 0) {
          database.collections.CHT.insert([{hash: loginHash, did: DID}]);
          database.collections.DidDocuments.insert([{did:DID, document:DIDDoc}]);
          res.send("Succesfully created user");
        }
        else {
          res.send("Failed to create user");
        }
      });
  });

});



bedrock.start();
