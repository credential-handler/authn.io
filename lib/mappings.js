/*
 * The module interface file for the mappings service.
 *
 * Copyright (c) 2015-2016 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var bedrock = require('bedrock');
var config = require('bedrock').config;
var cors = require('cors');
var database = require('bedrock-mongodb');

var BedrockError = bedrock.util.BedrockError;
var logger = bedrock.loggers.get('app');

var api = {};
module.exports = api;

bedrock.events.on('bedrock-mongodb.ready', function(callback) {
  async.waterfall([
    function(callback) {
      database.openCollections(['mapping'], callback);
    }, function(callback) {
      database.createIndexes([{
        collection: 'mapping',
        fields: {id: 1},
        options: {unique: true, background: false}
      }], callback);
  }], callback);
});

bedrock.events.on('bedrock-express.configure.routes', function(app) {
  // handle CORS preflight
  app.options('/mappings/:hash', cors());

  // TODO: validate params
  /**
   * Gets a mapping document given a hash.
   *
   * @param hash a properly formed urn:sha256 value.
   *
   * @return a mapping document.
   */
  app.get('/mappings/:hash', cors(), function(req, res, next) {
    database.collections.mapping.findOne(
      {id: database.hash(req.params.hash)}, {mapping: true},
      function(err, record) {
      if(err) {
        logger.error('Mongo error when trying to find mapping.', err);
        return next(new BedrockError(
          'Failed to find mapping due to internal error.',
          'MappingLookupFailed',
          {hash: req.params.hash, httpStatusCode: 500, 'public': true}));
      }
      if(!record) {
        return next(new BedrockError(
          'Decentralized identifier mapping not found.',
          'NotFound',
          {hash: req.params.hash, httpStatusCode: 404, 'public': true}));
      }

      // respond with the appropriate document
      res.set('Content-Type', 'application/ld+json');
      res.status(200);
      res.json(record.mapping);
    });
  });

  // registers a mapping to a piece of data
  app.post('/mappings/', function(req, res, next) {
    // TODO: Ensure only 'urn:sha256:xxxx' values are allowed for id
    // TODO: Check proof of work before allowing storage.
    var now = Date.now();
    var record = {
      id: database.hash(req.body.id),
      meta: {
        created: now,
        updated: now
      },
      mapping: {
        '@context': req.body['@context'],
        id: req.body.id,
        did: req.body.did,
        accessControl: req.body.accessControl,
        signature: req.body.signature
      }
    };

    // attempt to insert the mapping
    database.collections.mapping.insert(
      record, database.writeOptions, function(err) {
      if(err) {
        logger.error('Mongo error when trying to create mapping.', err);
        return next(new BedrockError(
          'Failed to create mapping for the provided \'id\'.',
          'MappingStorageFailed',
        {id: req.body.id, httpStatusCode: 500, 'public': true}));
      }

      // the mapping was stored successfully
      res.set('Location', config.server.baseUri + '/mappings/' + req.body.id);
      res.status(201);
      res.send();
    });
  });
});
