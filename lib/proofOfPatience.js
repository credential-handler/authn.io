/*
 * The module interface file for proof-of-patience.
 *
 * Copyright (c) 2015-2016 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var base64url = require('base64url');
var bedrock = require('bedrock');
var config = require('bedrock').config;
var crypto = require('crypto');
var database = require('bedrock-mongodb');
var jwt = require('jwt-simple');
var proofState = require('./proofState');
var BedrockError = bedrock.util.BedrockError;

var logger = bedrock.loggers.get('app');

var api = {};
module.exports = api;

/**
 * This module implements a proof mechanism to authenticate the users of
 * the system so that only those willing to wait for a certain period of
 * time can create entries in the database. The specific type of proof
 * used is called a Proof of Patience.
 *
 * To establish the proof, a client must:
 *
 *   1. Attempt to access a proof-protected URL
 *      This will either generate a proof token, or tell the client when to try
 *      to get a proof token in the future (if the IP is being rate limited).
 *      The proof token will be an encrypted value provided via the
 *      WWW-Authenticate HTTP header.
 *   2. The proof token should be echoed back by the client via an
 *      Authorization HTTP header once the Retry-After period has elapsed.
 *   3. Steps 1-2 will be repeated as many times as the server requires.
 */

// uniquely identifies proof of patience shared state
var PROOF_OF_PATIENCE_ID = 'proofOfPatience';

// cached proof state information
var _proofState = null;

/**
 * Creates a proof token given an IP address.
 *
 * @param ip the ip address that the proof token is being assigned to.
 * @param did the DID to associate with the token.
 * @param callback(err, token) called once the operation completes, returning
 *          a proof token, containing a base64 encoded 'proof' value and a
 *          'notBefore' value (number of milliseconds since the epoch).
 */
api.createToken = function(ip, did, callback) {
  async.auto({
    track: function(callback) {
      _trackTokenRequest(ip, callback);
    },
    getState: function(callback) {
      return _getProofState(callback);
    },
    create: ['track', 'getState', function(callback, results) {
      var state = results.getState;
      var nowInSecs = Math.floor(Date.now() / 1000);
      var waitInSeconds = _getWaitTime();
      var notBefore = nowInSecs + waitInSeconds;
      var notAfter = (notBefore +
        config.authio.proofs.proofOfPatience.decrementPeriodInSecs);

      var token = jwt.encode({
        exp: notAfter,
        nbf: notBefore,
        'urn:authorization.io': {
          decentralizedId: did,
          ip: ip
        }
      }, state.key.data, state.key.algorithm, {
        header: {kid: state.key.id}
      });

      callback(null, {
        token: token,
        waitInSeconds: waitInSeconds
      });
    }]
  }, function(err, results) {
    callback(err, results ? results.create : null);
  });
};

/**
 * Checks whether a submitted HTTP Authorization header contains a valid
 * proof.
 *
 * @param ip the IP address of the token bearer.
 * @param did the DID attempting to be modified for the token bearer.
 * @param token the proof token provided by the bearer.
 * @param callback(err, verified) called once the operation completes.
 */
api.verifyToken = function(ip, did, token, callback) {
  if(!token) {
    return callback(null, false);
  }

  async.auto({
    get: function(callback) {
      _getProofState(callback);
    },
    verify: ['get', function(callback, results) {
      var state = results.get;

      try {
        // parse header
        var header = token.split('.')[0];
        header = JSON.parse(base64url.decode(header));

        // get key that matches key ID
        var key;
        if(header.kid === state.key.id) {
          key = state.key;
        } else if(state.previousKey && header.kid === state.previousKey.id) {
          key = state.previousKey;
        } else {
          throw new Error('Invalid key identifier in token.');
        }

        // ensure algorithm matches
        if(header.alg !== key.algorithm) {
          throw new Error('Token algorithm does not match key algorithm.');
        }

        // decode and verify the token
        token = jwt.decode(token, key.data);
      } catch(e) {
        return callback(e, false);
      }

      // make sure the IP addresses and DIDs match
      var claims = token['urn:authorization.io'] || {};
      if(ip !== claims.ip || did !== claims.decentralizedId) {
        return callback(null, false);
      }

      callback(null, true);
    }]
  }, function(err, results) {
    callback(err, results ? results.verify : false);
  });
};

/**
 * Ensures the given request has been authorized via a proof-of-patience. This
 * includes checking IP rate limiting and checking the `Authorization` header
 * to see if a proof-of-patience token is included when registering a
 * decentralized ID. If not, or if the included token cannot be verified, then
 * response headers are set requesting a valid token and an error is raised.
 *
 * @param req the request to inspect.
 * @param res the response api.
 * @param did the decentralized ID associated with the proof.
 * @param callback(err) called once the operation completes.
 */
api.ensureAuthorized = function(req, res, did, callback) {
  _isRateLimited(req.ip, function(err, limited) {
    if(err) {
      return callback(err);
    }
    if(limited) {
      // if there are too many proof requests, wait and try again
      res.set('Retry-After', _getWaitTime());
      return callback(new BedrockError(
        'Your IP address has been rate limited, try again later.',
        'CallerIpRateLimited', {
          ip: req.ip, httpStatusCode: 503, 'public': true
        }));
    }

    var header = req.headers['authorization'];

    // check to see if proof of patience is included
    if(!header) {
      return api.createToken(req.ip, did, function(err, proof) {
        if(err) {
          return callback(err);
        }
        res.set('WWW-Authenticate',
          'Proof type=patience,token="' + proof.token + '"');
        res.set('Retry-After', proof.waitInSeconds);
        return callback(new BedrockError(
          'You must wait the number of seconds specified in the ' +
          '\'Retry-After\' HTTP header and attempt the request again with ' +
          'an \'Authorization\' header with a \'Proof\' ' +
          'credential, and a \'type\' and \'token\' that matches the ' +
          'value returned in the \'WWW-Authenticate\' header of this response.',
          'ProofOfPatienceRequired',
          {did: did, httpStatusCode: 401, 'public': true}));
      });
    }

    // verify token
    var token = null;
    var tokenMatches = header.match(/token\s*=\s*"(.*?)"/);
    if(tokenMatches) {
      token = tokenMatches.pop();
    }
    api.verifyToken(req.ip, did, token, function(err, verified) {
      if(!err && verified) {
        return callback();
      }
      res.set('Retry-After', _getWaitTime());
      return callback(new BedrockError(
        'The provided Proof of Patience Authorization token is not valid. ' +
        'Please try again.',
        'ProofOfPatienceTokenInvalid', {
          httpStatusCode: 503,
          'public': true
        }));
    });
  });
};

/**
 * Generate a random number of seconds between low and high.
 *
 * @param low the lower bound.
 * @param high the upper bound.
 *
 * @return a number between low and high (inclusive).
 */
function _getWaitTime(low, high) {
  if(high === undefined) {
    high = config.authio.proofs.proofOfPatience.maxWaitTimeInSecs;
  }
  if(low === undefined) {
    low = config.authio.proofs.proofOfPatience.minWaitTimeInSecs;
  }
  return Math.floor(Math.random() * (high - low + 1) + low);
}

/**
 * Gets whether or not a particular IP address is rate limited.
 *
 * @param ip the IP address to check against the rate limiting database.
 * @param callback(err, limited) called once the operation completes.
 */
function _isRateLimited(ip, callback) {
  // TODO: need caching?

  async.auto({
    // count total requests
    total: function(callback) {
      database.collections.proofOfPatienceRequest.count(
        {}, function(err, results) {
        callback(err, results ? results.count : null);
      });
    },
    // count requests per IP
    perIp: function(callback) {
      database.collections.proofOfPatienceRequest.count(
        {ip: ip}, function(err, results) {
        callback(err, results ? results.count : null);
      });
    }
  }, function(err, results) {
    if(err) {
      return callback(err);
    }

    // check to see if the maximum number of requests is being exceeded
    // (DDoS mitigation)
    if(results.total > config.authio.proofs.proofOfPatience.maxActive) {
      return callback(null, true);
    }

    // check to see if the maximum number of requests for the IP is exceeded
    // (DoS mitigation)
    if(results.perIp > config.authio.proofs.proofOfPatience.maxPerIp) {
      return callback(null, true);
    }

    callback(null, false);
  });
}

/**
 * Track the request for a proof token by a client with the given IP address.
 *
 * @param ip the IP address to track.
 * @param callback(err) called once the operation completes.
 */
function _trackTokenRequest(ip, callback) {
  database.collections.proofOfPatienceRequest.insert({
    ip: ip,
    created: new Date()
  }, database.writeOptions, function(err) {
    callback(err);
  });
}

/**
 * Gets the cached proof state information, retrieving it from the database
 * and recycling HMAC keys as needed.
 *
 * @param callback(err, state) called once the operation completes.
 */
function _getProofState(callback) {
  var done = callback;
  var keyExpirationInSecs = config.authio.proofs.proofOfPatience
    .keyExpirationInSecs;
  async.auto({
    get: function(callback) {
      // use cached proof state if available, expiration checked later
      if(_proofState) {
        return callback(null, _proofState);
      }

      // get proof state from database
      proofState.get(PROOF_OF_PATIENCE_ID, function(err, state) {
        if(err && err.name === 'NotFound') {
          return callback(null, null);
        }
        callback(err, state);
      });
    },
    ensureExists: ['get', function(callback, results) {
      if(results.get) {
        return callback(null, results.get);
      }
      // attempt to insert new state
      var nowInSecs = Math.floor(Date.now() / 1000);
      var state = {
        id: PROOF_OF_PATIENCE_ID,
        previousKey: null,
        key: {
          id: '' + nowInSecs,
          algorithm: 'HS256',
          data: _generateHmacKey(),
          created: nowInSecs,
          expires: nowInSecs + keyExpirationInSecs
        }
      };
      proofState.insert(PROOF_OF_PATIENCE_ID, state, function(err) {
        if(err && err.name === 'DuplicateProofState') {
          // another process inserted; clear cache, loop, and try again
          _proofState = null;
          return process.nextTick(function() {
            _getProofState(done);
          });
        }
        return callback(err, state);
      });
    }],
    update: ['ensureExists', function(callback, results) {
      var state = results.ensureExists;
      // Note: requires clock sync amongst auth.io nodes
      var nowInSecs = Math.floor(Date.now() / 1000);
      if(state.key.expires > nowInSecs) {
        // key not expired, nothing to do
        return callback(null, state);
      }
      // key expired, generate a new one
      state.previousKey = state.key;
      state.key = {
        id: '' + nowInSecs,
        algorithm: 'HS256',
        data: _generateHmacKey(),
        created: nowInSecs,
        expires: nowInSecs + keyExpirationInSecs
      };
      logger.verbose('[proof-of-patience] recycling HMAC key...');
      proofState.update(PROOF_OF_PATIENCE_ID, state, {
        query: {
          'state.key.id': state.previousKey.id
        }
      }, function(err, updated) {
        if(err) {
          logger.error(
            'Mongo error when trying to get proof-of-patience state.', err);
          return callback(err);
        }
        if(!updated) {
          // another process updated; clear cache, loop, and try again
          logger.verbose(
            '[proof-of-patience] another process recycled HMAC key.');
          _proofState = null;
          return process.nextTick(function() {
            _getProofState(done);
          });
        }
        callback(null, state);
      });
    }],
    decode: ['update', function(callback, results) {
      var state = results.update;
      state.key.data = new Buffer(state.key.data, 'base64');
      if(state.previousKey) {
        state.previousKey.data = new Buffer(
          state.previousKey.data, 'base64');
      }
      // cache proof state
      _proofState = state;
      callback(null, state);
    }]
  }, function(err) {
    callback(err, _proofState);
  });
}

function _generateHmacKey() {
  return crypto.randomBytes(16).toString('base64');
}

//////////////////////// Bedrock event setup //////////////////////////

bedrock.events.on('bedrock-mongodb.ready', function(callback) {
  async.auto({
    openCollections: function(callback) {
      // collection for tracking requests
      database.openCollections(['proofOfPatienceRequest'], callback);
    },
    createIndexes: ['openCollections', function(callback) {
      // TODO: if `decrementPeriodInSecs` changes, the index will not be
      // recreated if it already existed and the config change will therefore
      // not take affect with respect to clearing tracked pending requests
      // using the new TTL -- a getIndexes() call plus a check against
      // the config value, followed by dropping and recreating the index
      // must be performed to remedy this
      database.createIndexes([{
        collection: 'proofOfPatienceRequest',
        fields: {ip: 1},
        options: {unique: false, background: false}
      }, {
        collection: 'proofOfPatienceRequest',
        fields: {'meta.created': 1},
        options: {
          unique: false,
          background: false,
          expireAfterSeconds: config.authio.proofs.proofOfPatience
            .decrementPeriodInSecs
        }
      }], callback);
    }],
    getProofState: ['createIndexes', function(callback) {
      _getProofState(callback);
    }]
  }, function(err) {
    callback(err);
  });
});
