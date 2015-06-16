/*
 * The module interface file for proofs.
 *
 * Copyright (c) 2015 The Open Payments Foundation. All rights reserved.
 */
var bedrock = require('bedrock');
var config = require('bedrock').config;
var crypto = require('crypto');

// alias for bedrock error
var BedrockError = bedrock.util.BedrockError;

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
 *   1. GET /proofs
 *      This will either get a proof token, or tell the client when to try
 *      to get a proof token in the future (if the IP is being rate limited).
 *      The Location HTTP header will be set to the proof token ID to GET
 *      next.
 *   2. Wait for the amount of seconds specified in the Retry-After
 *      HTTP header and then GET the location specified in the
 *      Location header.
 *   3. GET /proofs/:token
 *      This will either tell the client to start over via a 404, or
 *      it will tell the client to wait for the amount of seconds
 *      specified in the Retry-After HTTP header and then
 *      fetch the Location header.
 *   4. Steps 2-3 will be repeated as many times as the server requires
 *      and the 200 status code will notify the caller that the Proof of
 *      Patience is complete.
 */

// the maximum number of active proofs at any given time for an IP
var MAX_PROOFS_PER_IP = 10;
var PROOF_TIMEOUT_IN_SECS = 120;

// the mapping of IPs to proofs
var gProofs = {};

// the proof timeout list
var gProofTimeout = [];

// proof database methods

/* TODO: Rework to be nearly-stateless. Require DID when generating
proof token (or require some more generic piece of information that will
be used in the request that the token grants authorization for later). The
token should contain a timestamp for when it can be used and a piece of
information it can be used for (eg: a DID). The token should then be
encrypted and appear as an opaque value. The symmetric key should be
auto-generated on startup and is the only state information required. When
a request that is proof-token based occurs, the token is decrypted and checked
to see if the patience period has expired and if the piece of information
matches what's in the request. If so, the request is authorized. When
using this for DID registration, if a DID has already been registered,
reuse of a token will cause a duplication error. */

/**
 * Creates a proof token given an IP address.
 *
 * @param ip the ip address that the proof token is being assigned to
 *
 * @return a proof token.
 */
api.createProofToken = function(ip) {
  // create the entry if it doesn't already exist
  if(!gProofs[ip]) {
    gProofs[ip] = {};
  }

  var shasum = crypto.createHash('sha1');
  var now = Date.now();
  shasum.update(ip + now);
  var proofId = shasum.digest('hex');
  var waitInSeconds = _randomNumber(10, 15);
  var notBefore = now + (waitInSeconds * 1000);
  var proof = {
    id: proofId,
    clientIp: ip,
    started: now,
    notBefore: notBefore,
    clean: now + (PROOF_TIMEOUT_IN_SECS * 1000),
    established: false,
    used: 0
  };
  gProofs[ip][proofId] = proof;
  gProofTimeout.push(proof);

  return proof;
};

/**
 * Gets a proof given an IP address and a proof token ID.
 *
 * @param ip the ip address associated with the proof.
 * @param proofId the ID of the proof token.
 *
 * @return the proof or null if there is no associated proof.
 */
api.getProof = function(ip, proofId) {
  var proof = null;

  if(gProofs[ip] && gProofs[ip][proofId]) {
    proof = gProofs[ip][proofId];
  }

  return proof;
};

/**
 * Get the number of active proofs for a given IP address
 *
 * @param ip The IP address of the block of proofs.
 *
 * @return the number of proofs associated with the IP address.
 */
api.getProofCount = function(ip) {
  var count = 0;

  if(gProofs[ip]) {
    count = Object.keys(gProofs[ip]).length;
  }

  return count;
};

/**
 * Calculate the amount of time (in seconds) left to establish a proof.
 *
 * @param proof the proof to use for the calculation.
 *
 * @return the number of seconds left before the proof is established.
 */
api.calculateWaitInSeconds = function(proof) {
  var now = Date.now();
  return (1 + Math.floor((proof.notBefore - now) / 1000));
};

// proof REST API

bedrock.events.on('bedrock-express.configure.routes', function(app) {
  // TODO: validate params
  /**
   * Gets a proof token.
   *
   * @return a proof token
   */
  app.get('/proofs', function(req, res, next) {
    // ensure that less than MAX_PROOFS_PER_IP are in the proof list
    if(api.getProofCount(req.ip) > MAX_PROOFS_PER_IP) {
      // if there are too many proofs, wait for 30 seconds and try again
      res.set('Retry-After', _randomNumber(20, 30));
      res.status(503);
      // FIXME: This should probably be a BedrockError, but you can't
      // easily set a header w/ a BedrockError
      return res.send('Your IP address is limited, please try back later.');
    }

    // create the proof
    var proof = api.createProofToken(req.ip);

    // respond with the appropriate document
    var waitInSeconds = api.calculateWaitInSeconds(proof);
    res.set('X-Proof', 'type=patience, id=' + proof.id);
    res.set('Retry-After', waitInSeconds);
    res.set('Location', config.server.baseUri + '/proofs/' + proof.id);
    res.status(201);
    res.send();
  });

  // registers a mapping to a piece of data
  app.get('/proofs/:proof', function(req, res, next) {
    var now = Date.now();
    var clientIp = req.ip;
    var proofId = req.params.proof;
    var proof = api.getProof(req.ip, req.params.proof);

    if(!proof) {
      return next(new BedrockError(
        'The given proof was not found for your IP address.',
        'proofNotFound', {
          ip: clientIp, proof: proofId, httpStatusCode: 404,
          'public': true
      }));
    }

    // check to see if the proof has been established
    if(now > proof.notBefore) {
      proof.established = true;
      res.status(200);
    } else {
      var waitInSeconds = api.calculateWaitInSeconds(proof);
      res.set('X-Proof', 'type=patience, id=' + proof.id);
      res.set('Retry-After', waitInSeconds);
      res.set('Location', config.server.baseUri + '/proofs/' + proof.id);
      res.status(503);
    }

    res.send();
  });
});

function _randomNumber(low, high) {
  return Math.floor(Math.random() * (high - low + 1) + low);
}