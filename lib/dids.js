/*!
 * The module interface file for DID document management.
 *
 * New BSD License (3-clause)
 * Copyright (c) 2015-2016, Digital Bazaar, Inc.
 * Copyright (c) 2015-2016, Accreditrust Technologies, LLC
 * All rights reserved.
 */
var async = require('async');
var bedrock = require('bedrock');
var config = require('bedrock').config;
var cors = require('cors');
var didio = require('did-io');
var database = require('bedrock-mongodb');
var jsigs = require('jsonld-signatures');
var jsonld = bedrock.jsonld;
var proofOfPatience = require('./proofOfPatience');
var validate = require('bedrock-validation').validate;
var BigNumber = require('bignumber.js');
var BedrockError = bedrock.util.BedrockError;

var logger = bedrock.loggers.get('app');

var api = {};
module.exports = api;

bedrock.events.on('bedrock.init', function() {
  // configure jsonld-signatures to load DID-based URLs from the database
  var jsonld = bedrock.jsonld();
  var baseUrl = bedrock.config.server.baseUri + '/dids/';
  jsonld.documentLoader = function(url, callback) {
    // if not a DID or baseUrl to fetch a DID, do passthrough
    if(url.indexOf('did') !== 0 && url.indexOf(baseUrl) !== 0) {
      return bedrock.jsonld.documentLoader(url, callback);
    }

    // get full DID doc ID
    var docId;
    var parsed = jsonld.url.parse(url);
    var components = parsed.normalizedPath.split('/');
    if(parsed.scheme === 'did') {
      // example urls: did:abcde, did:abcde/keys/1
      // components: [<hex for did>, ...]
      docId = 'did:' + (components[0] || '');
      if(components.length > 1) {
        // URL is for reaching into DID document, not the full document...
        // so fetch this via did-io, which will, in turn, call into this
        // document loader to fetch the full DID doc
        return didio.get(url, {baseUrl: baseUrl}, function(err, doc) {
          callback(err, {contextUrl: null, document: doc, documentUrl: url});
        });
      }
    } else {
      // example urls: <baseUrl>/dids/did:abcde
      // components: ['', 'dids', <did>]
      docId = components[2] || '';
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
  // handle CORS preflight
  app.options('/dids/:credential', cors());

  /**
   * Gets a DID document given a DID.
   *
   * @param did the DID URI to fetch.
   *
   * @return a DID document.
   */
  app.get('/dids/:did', cors(), function(req, res, next) {
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
  app.post('/dids/',
    validate('services.did.createDidObject'),
    function(req, res, next) {
      var did = req.body.id;
      async.auto({
        checkProof: function(callback) {
          proofOfPatience.ensureAuthorized(req, res, did, callback);
        },
        getKey: function(callback) {
          var signature = jsonld.getValues(req.body, 'signature')[0];
          var creator = jsonld.getValues(signature, 'creator')[0];
          var key = jsonld.getValues(req.body, 'publicKey')
            .filter(key => key.id === creator)[0] || {};
          key['@context'] = req.body['@context'];
          callback(null, key);
        },
        checkPermission: ['checkProof', 'getKey', function(callback, results) {
          api.hasPermission(
            req.body, results.getKey, 'writePermission', callback);
        }],
        verify: ['checkPermission', function(callback, results) {
          // ensure digital signature is a match
          _verifyDidDocument(req.body, {
            publicKey: results.getKey,
            publicKeyOwner: req.body
          }, callback);
        }],
        insert: ['verify', function(callback) {
          // create DID object record
          var now = Date.now();
          var record = {
            id: database.hash(did),
            meta: {
              created: now,
              updated: now
            },
            didDocument: req.body
          };

          // insert the record into the database
          database.collections.didDocument.insert(
            record, database.writeOptions, function(err) {
            if(err) {
              if(database.isDuplicateError(err)) {
                return next(new BedrockError(
                  'Failed to store DID document; duplicate "id" detected.',
                  'DuplicateDidDocument',
                {url: req.body.id, httpStatusCode: 409, 'public': true}));
              }
              logger.error(
                'Mongo error when trying to write DID document.', err);
              return callback(new BedrockError(
                'Failed to store DID document.',
                'DidDocumentError',
                {url: req.body.id, httpStatusCode: 500, 'public': true}));
            }

            // the DID was stored successfully
            res.set('Location', config.server.baseUri + '/dids/' + req.body.id);
            res.status(201);
            res.send();
          });
        }]
      }, function(err) {
        if(err) {
          next(err);
        }
      });
    });

  // updates an existing DID document
  app.post('/dids/:did',
    validate('services.did.updateDidObject'),
    function(req, res, next) {
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

/**
 * Checks whether or not a signature with the given key grants a particular
 * permission for interaction with the given document.
 *
 * @param doc the document to check.
 * @param key the key to check.
 * @param permission the required permission.
 * @param callback(err, granted) called once the operation completes.
 */
api.hasPermission = function(doc, key, permission, callback) {
  /* Note: **IMPORTANT** This will search for a matching key ID or
  owner ID, however, no check is made here to ensure that the owner ID
  is not spoofed. This helper method is currently only called prior to
  checking a digital signature on a DID document -- a process that
  will involve verifying the owner ID is not spoofed on the key. */
  if(!key) {
    return callback(null, false);
  }
  // `permission` example: 'writePermission'
  var authorized = jsonld.getValues(doc.accessControl, permission);
  for(var i = 0; i < authorized.length; ++i) {
    if((jsonld.hasValue(authorized[i], 'type', 'Identity') &&
      authorized[i].id === key.owner) ||
      (jsonld.hasValue(authorized[i], 'type', 'CryptographicKey') &&
      authorized[i].id === key.id)) {
      return callback(null, true);
    }
  }
  callback(null, false);
};

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
      var expectedCounter = new BigNumber(updateCounter).minus(1).toString(10);
      if(updateCounter === '1') {
        query.$or = [{
          'didDocument.urn:webdht:updateCounter': expectedCounter
        }, {
          'didDocument.urn:webdht:updateCounter': null
        }];
      } else {
        query['didDocument.urn:webdht:updateCounter'] = expectedCounter;
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

function _verifyDidDocument(doc, options, callback) {
  if(typeof options === 'function') {
    callback = options;
    options = {};
  }
  options = options || {};
  jsigs.verify(doc, options, function(err, verified) {
    // TODO: should check `err` here and report different types or no?
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
      api.hasPermission(doc, results.getKey, permission, callback);
    }]
  }, function(err, results) {
    return callback(err, results.check || false);
  });
}
