/*
 * The module interface file for DID document management.
 *
 * Copyright (c) 2015 The Open Payments Foundation. All rights reserved.
 */
var async = require('async');
var bedrock = require('bedrock');
var config = require('bedrock').config;
var database = require('bedrock-mongodb');
var proofs = require('./proofs');

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
      {id: database.hash(req.params.did)}, {didDocument: true},
      function(err, record) {
      if(err) {
        logger.error('Mongo error when trying to find DID document.', err);
        return next(new BedrockError(
          'Failed to find DID document due to internal error.',
          'DidDocumentLookupFailed',
          {did: req.params.did, httpStatusCode: 500, 'public': true}));
      }
      if(!record) {
        return next(new BedrockError(
          'Failed to find DID document for the provided DID.',
          'DidLookupFailed',
          {did: req.params.did, httpStatusCode: 404, 'public': true}));
      }

      // respond with the appropriate document
      res.set('Content-Type', 'application/ld+json');
      res.status(200);
      res.json(record.didDocument);
    });
  });

  // registers a new DID and creates a DID document for it
  app.post('/dids/', function(req, res, next) {
    // TODO: Check input via JSON Schema
    var did = req.body.id;
    var idp = req.body.idp;
    var accessControl = req.body.accessControl;
    var publicKeys = req.body.publicKey;

    if(proofs.isRateLimited(req.ip)) {
      // if there are too many proof requests, wait for 20-30 seconds and
      // try again
      res.set('Retry-After', proofs.getWaitTime(20, 30));
      return next(new BedrockError(
        'Your IP address has been rate limited, try again later.',
        'CallerIpRateLimited', {
          ip: req.ip, httpStatusCode: 503, 'public': true
      }));
    }

    // check to see if proof of patience is included
    if(!req.headers['authorization']) {
      var proof = proofs.createProofToken(req.ip, did);
      res.set('WWW-Authenticate',
        'Proof type=patience,token="' + proof.token + '"');
      res.set('Retry-After', proof.waitInSeconds);
      return next(new BedrockError(
        'You must wait the number of seconds specified in the ' +
        '\'Retry-After\' HTTP header and attempt the request again with ' +
        'an \'Authenticate\' header with a \'Proof\' ' +
        'credential, and a \'type\' and \'token\' that matches the ' +
        'value returned in the \'WWW-Authenticate\' header of this response.',
        'ProofOfPatienceRequired',
        {did: did, httpStatusCode: 401, 'public': true}));
    }

    // check validity of proof of patience
    var proofToken = '';
    var tokenMatches =
      req.headers['authorization'].match(/token\s*=\s*"(.*?)"/);
    if(tokenMatches) {
      proofToken = tokenMatches.pop();
    }
    if(!proofs.isProofTokenValid(req.ip, req.body.id, proofToken)) {
      res.set('Retry-After', proofs.getWaitTime(20, 30));
      return next(new BedrockError(
        'The provided Proof of Patience Authorization token is not valid. ' +
        'Please try again.',
        'ProofOfPatienceTokenInvalid', {
          httpStatusCode: 503, 'public': true
      }));
    }

    // ensure that proof id matches DID being claimed
    var now = Date.now();
    var record = {
      id: database.hash(did),
      meta: {
        created: now,
        updated: now
      },
      didDocument: {
        '@context': 'https://w3id.org/identity/v1',
        id: did,
        idp: idp,
        accessControl: accessControl,
        publicKey: publicKeys,
        signature: req.body.signature
      }
    };
    if(req.body.url) {
      record.didDocument.url = req.body.url;
    }

    // insert the DID document into the database
    // TODO:
    database.collections.didDocument.insert(
      record, database.writeOptions, function(err) {
      if(err) {
        if(database.isDuplicateError(err)) {
          return next(new BedrockError(
            'Failed to store DID document; duplicate "id" detected.',
            'DuplicateDidDocument',
          {id: req.body.id, httpStatusCode: 409, 'public': true}));
        }
        logger.error('Mongo error when trying to write DID document.', err);
        return next(new BedrockError(
          'Failed to store DID document.',
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
