/*
 * The module interface file for DID document management.
 *
 * Copyright (c) 2015 The Open Payments Foundation. All rights reserved.
 */
var async = require('async');
var bedrock = require('bedrock');
var config = require('bedrock').config;
var didio = require('did-io');
var database = require('bedrock-mongodb');
var jsigs = require('jsonld-signatures');
var proofs = require('./proofs');
var BigNumber = require('bignumber.js');

var BedrockError = bedrock.util.BedrockError;
var logger = bedrock.loggers.get('app');

var api = {};
module.exports = api;

bedrock.events.on('bedrock.init', function() {
  // configure jsonld-signatures to load DID-based URLs from the database
  var jsonld = bedrock.jsonld();
  jsonld.documentLoader = function(url, callback) {
    var parsed = jsonld.url.parse(url);
    if(parsed.scheme !== 'did') {
      return bedrock.jsonld.documentLoader(url, callback);
    }
    // get full DID doc ID
    var components = parsed.normalizedPath.split('/');
    var docId = 'did:' + components[0] || '';
    if(components.length > 1) {
      // URL is for reaching into DID document, not the full document...
      // so fetch this via did-io, which will, in turn, call into this
      // document loader to fetch the full DID doc
      return didio.get(url, function(err, doc) {
        callback(err, {contextUrl: null, document: doc, documentUrl: url});
      });
    }
    // fetch full DID doc
    _getDidDocument(docId, function(err, record) {
      callback(err, {
        contextUrl: null,
        document: record ? record.didDocument : null,
        documentUrl: url
      });
    });
  };
  jsigs.use('jsonld', jsonld);
  didio.use('jsonld', jsonld);
});

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
    _getDidDocument(req.params.did, function(err, record) {
      if(err) {
        return next(err);
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

    // TODO: can't just break apart DID document like this ... need to
    // check signature and accept as-is

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
      // TODO: use posted DID doc as-is w/signature
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
    database.collections.didDocument.insert(
      record, database.writeOptions, function(err) {
      if(err) {
        if(database.isDuplicateError(err)) {
          return next(new BedrockError(
            'Failed to store DID document; duplicate "id" detected.',
            'DuplicateDidDocument',
          {url: req.body.id, httpStatusCode: 409, 'public': true}));
        }
        logger.error('Mongo error when trying to write DID document.', err);
        return next(new BedrockError(
          'Failed to store DID document.',
          'DidDocumentError',
          {url: req.body.id, httpStatusCode: 500, 'public': true}));
      }

      // the DID was stored successfully
      res.set('Location', config.server.baseUri + '/dids/' + req.body.id);
      res.status(201);
      res.send();
    });
  });

  // updates an existing DID document
  app.post('/dids/:did', function(req, res, next) {
    // TODO: Check input via JSON Schema
    _updateDidDocument(req.body, function(err) {
      if(err) {
        return next(err);
      }
      // respond with updated document
      res.set('Content-Type', 'application/ld+json');
      res.status(200);
      res.json(req.body);
    });
  });
});

function _getDidDocument(id, callback) {
  database.collections.didDocument.findOne(
    {id: database.hash(id)}, {id: true, didDocument: true}, function(err, record) {
    if(err) {
      logger.error('Mongo error when trying to find DID document.', err);
      return callback(new BedrockError(
        'Failed to find DID document due to an internal error.',
        'DidDocumentError',
        {url: id, httpStatusCode: 500, 'public': true}));
    }
    if(!record) {
      return callback(new BedrockError(
        'Failed to find DID document for the provided DID.',
        'NotFound',
        {url: id, httpStatusCode: 404, 'public': true}));
    }
    callback(null, record);
  });
}

function _updateDidDocument(doc, callback) {
  async.auto({
    get: function(callback) {
      // TODO: optimize to check for given doc updateCounter early here as
      // well, no need to verify signature on POSTed doc, etc. if updateCounter
      // is wrong
      _getDidDocument(doc.id, callback);
    },
    authorize: ['get', function(callback, results) {
      // check for write permission
      _isAuthorized(
        results.get.didDocument, doc.signature.creator, 'writePermission',
        callback);
    }],
    verify: ['authorize', function(callback) {
      _verifyDidDocument(doc, callback);
    }],
    update: ['verify', function(callback) {
      // build update query; allow updates to documents w/o updateCounters if
      // the specified updateCounter is '1'
      var query = {id: database.hash(doc.id)};
      var updateCounter = doc['urn:webdht:updateCounter'];
      if(updateCounter === '1') {
        query.$or = [{
          'urn:webdht:updateCounter': updateCounter
        }, {
          'urn:webdht:updateCounter': null
        }];
      } else {
        var expected = new BigNumber(updateCounter).minus(1);
        query['urn:webdht:updateCounter'] = expected.toString(10);
      }
      database.collections.didDocument.update(query, {
        $set: {didDocument: doc, 'meta.updated': Date.now()}
      }, database.writeOptions, function(err, result) {
        if(err) {
          logger.error('Mongo error when trying to update DID document.', err);
          err = new BedrockError(
            'Failed to update DID document due to an internal error.',
            'DidDocumentError',
            {url: doc.id, httpStatusCode: 500, 'public': true});
        }
        callback(err, result);
      });
    }],
    check: ['update', function(callback, results) {
      if(results.update.result.n !== 0) {
        // update successful
        return callback();
      }
      // update failed; determine if update counter was wrong or if doc DNE
      _getDidDocument(doc.id, function(err) {
        if(err) {
          // doc DNE or database error
          return callback(err);
        }
        // doc exists; update counter was wrong
        return callback(new BedrockError(
          'Failed to update DID document. The update counter was incorrect.',
          'DidDocumentConflict',
          {url: doc.id, httpStatusCode: 409, 'public': true}));
      });
    }]
  }, callback);
}

function _verifyDidDocument(doc, callback) {
  jsigs.verify(doc, function(err, verified) {
    if(!verified) {
      return callback(new BedrockError(
        'Failed to verify DID document. Its digital signature could not ' +
        'be verified.', 'InvalidSignature',
        {url: doc.id, httpStatusCode: 400, 'public': true}));
    }
    callback();
  });
}

function _isAuthorized(doc, keyId, permission, callback) {
  var jsonld = jsigs.use('jsonld');
  async.auto({
    getKey: function(callback) {
      jsonld.documentLoader(keyId, function(err, doc) {
        if(err) {
          err.status = err.httpStatusCode || 404;
          return callback(err);
        }
        doc = doc.document;
        if(typeof doc === 'string') {
          try {
            doc = JSON.parse(doc);
          } catch(e) {}
        }
        callback(null, doc);
      });
    },
    check: ['getKey', function(callback, results) {
      /* Note: **IMPORTANT** This will search for a matching key ID or
      owner ID, however, no check is made here to ensure that the owner ID
      is not spoofed. This helper method is currently only called prior to
      checking a digital signature on a DID document -- a process that
      will involve verifying the owner ID is not spoofed on the key. */

      // `permission` example: 'writePermission'
      var authorized = jsonld.getValues(doc.accessControl, permission);
      for(var i = 0; i < authorized.length; ++i) {
        if((jsonld.hasValue(authorized[i], 'type', 'Identity') &&
          authorized[i].id === results.getKey.owner) ||
          (jsonld.hasValue(authorized[i], 'type', 'CryptographicKey') &&
          authorized[i].id === results.getKey.id)) {
          return callback(null, true);
        }
      }
      callback(null, false);
    }]
  }, function(err, results) {
    return callback(err, results.check || false);
  });
}
