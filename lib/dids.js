/*
 * The module interface file for DID document management.
 *
 * Copyright (c) 2015 The Open Payments Foundation. All rights reserved.
 */
var async = require('async');
var bedrock = require('bedrock');
var config = require('bedrock').config;
var database = require('bedrock-mongodb');

// alias for bedrock error
var BedrockError = bedrock.util.BedrockError;
var logger = bedrock.loggers.get('app');

var api = {};
module.exports = api;

// On MongoDb being ready
bedrock.events.on('bedrock-mongodb.ready', function(callback) {
  async.waterfall([
    function(callback) {
      database.openCollections(['didDocument'], callback);
    },
    function(callback) {
      database.createIndexes([{
        collection: 'didDocument',
        fields: {id: 1},
        options: {unique: true, background: false}
      }], callback);
  }], callback);
});

bedrock.events.on('bedrock-express.configure.routes', function(app) {
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

  // registers a hash to an encrypted blob and a did to a didDocument
  app.post('/dids/', function(req, res, next) {
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
      res.set('Location', config.server.baseUri + '/dids/' + req.body.id);
      res.status(201);
      res.send();
    });
  });
});
