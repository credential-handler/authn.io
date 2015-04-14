var bedrock = require('bedrock');
var path = require("path");
var database = require('bedrock-mongodb');

require('bedrock-express');
require('bedrock-requirejs');
require('bedrock-server');
require('bedrock-views');

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

// add pseudo bower package
bedrock.config.requirejs.bower.packages.push({
  path: path.join(__dirname, 'loginhubfrontend'),
  manifest: {
    name: 'loginhubfrontend',
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
  database.openCollections(['CHT'], function(err) {
    if(err) {
      return callback(err);
    }
    callback();
  });
});

bedrock.events.on('bedrock-express.configure.routes', function(app) {

  app.post('/DIDquery', function(req, res){
    console.log(req.body);
    database.collections.CHT.find({hash: req.body.hashQuery})
    .toArray(function(err, docs){
      if(docs.length == 0){
        var userDID = "did:" + bedrock.util.uuid();
        database.collections.CHT.insert([{hash: req.body.hashQuery, did: userDID}]);
        res.send(userDID);
      }
      else{
        res.send(docs[0].did);
      }
    });
  });
});



bedrock.start();
