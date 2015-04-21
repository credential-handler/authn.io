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

// bedrock.config.views.routes.push(['/*', 'index.html']);
bedrock.config.views.routes.push(['/cc', 'index.html']);
bedrock.config.views.routes.push(['/idp', 'index.html']);
bedrock.config.views.routes.push(['/register', 'index.html']);

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
        if(req.body.callerData) {
          var callerData = JSON.parse(req.body.callerData);
          if(callerData.callback) {
            vars.callback = callerData.callback;
          } 
          if(callerData.credential) {
            vars.credential = callerData.credential;
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
  app.get('/DID', function(req, res){
    console.log('/DID req.query.hashQuery', req.query.hashQuery);
    database.collections.CHT.find({hash: req.query.hashQuery})
    .toArray(function(err, docs){
      if(docs.length == 0){
        res.status(400).send('Invalid login info');
      }
      else{
        // send session id aka login the person
        console.log('/DID response', docs[0].did);
        res.send(docs[0].did);
      }
    });
  });

  // TODO: validate params
  /*
   * params: did 
   * return: idp
   */
  app.get('/DID/Idp', function(req, res){
    console.log('/DID/Idp req.query', req.query);
    database.collections.DidDocuments.find({did:req.query.did})
    .toArray(function(err, docs){
      if(docs.length == 0){
        res.status(400).send('Invalid DID');
      }
      else{
        console.log('/DID/Idp response', docs[0].document.idp);
        res.send(docs[0].document.idp);
      }
    });

  });

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

  app.post('/DID/idp', function(req, res) {
  	var DID = req.body.DID;
  	var idp = req.body.idp;
  	database.collections.DidDocuments.update({did:Did},{idp: idp}, function(err,result){
  		if(err){
  			res.send("Invalid Did");
  		}
  		else {
  		  	res.send("Updated idp");
  		}
  	});
  		

  });

  app.post('/DID/publicKey', function(req, res) {
    var DID = req.body.DID;
    var key = req.body.key;
    database.collections.DidDocuments.update({did:DID}, {$push: {publicKeys: key}}, {upsert: false}, function(err, result){
      if(err){
        res.send("Could not add public key");
      }
      else{
        res.send("Added public key");
      }
    });
  });

  app.post('/DID/loginHash', function(req, res) {
    var DID = req.body.DID;
    var loginHash = req.body.loginHash;
    database.collections.CHT.update({did:DID}, {hash:loginHash}, {upsert: false}, function(err, result){
      if(err){
        res.send("Could not update loginhash");
      }
      else{
        res.send("Updated loginHash");
      }
    });
  });

});



bedrock.start();
