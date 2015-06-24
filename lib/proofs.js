/*
 * The module interface file for proofs.
 *
 * Copyright (c) 2015 The Open Payments Foundation. All rights reserved.
 */
var _ = require('lodash');
var bedrock = require('bedrock');
var config = require('bedrock').config;
var crypto = require('crypto');

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

// variables that track the number of active proofs
var _totalActiveProofs = 0;
var _proofs = {};

// proof encryption parameters
var _proofKey = crypto.randomBytes(16);
var _proofIv = crypto.randomBytes(16);

/**
 * Generate a random number of seconds between low and high.
 *
 * @param low the lower bound.
 * @param high the upper bound.
 *
 * @return a number between low and high (inclusive)
 */
api.getWaitTime = function(low, high) {
  return Math.floor(Math.random() * (high - low + 1) + low);
};

/**
 * Gets whether or not a particular IP address is rate limited.
 *
 * @param ip the IP address to check against the rate limiting database.
 *
 * @return true if the IP is rate limited, false otherwise.
 */
api.isRateLimited = function(ip) {
  // check to see if the maximum number of proofs is being exceeded
  // (DDoS mitigation)
  if(_totalActiveProofs > config.authio.proofs.maxActive) {
    return true;
  }

  // check to see if the maximum number of proofs for the IP is exceeded
  // (DoS mitigation)
  if(api.getProofCount(ip) > config.authio.proofs.maxPerIp) {
    return true;
  }

  return false;
};

/**
 * Creates a proof token given an IP address.
 *
 * @param ip the ip address that the proof token is being assigned to.
 * @param did the DID to associate with the token.
 *
 * @return a proof object, containing a base64 encoded 'proof' value and a
 *   'notBefore' value (number of milliseconds since the epoch).
 */
api.createProofToken = function(ip, did) {
  // increment the proof count
  api.incrementProofCount(ip);

  // TODO: Use a better AES authentication mode like GCM
  var cipher = crypto.createCipheriv('aes-128-ctr', _proofKey, _proofIv);
  var waitInSeconds = api.getWaitTime(
    config.authio.proofs.minWaitTimeInSecs,
    config.authio.proofs.maxWaitTimeInSecs);
  var notBefore = Date.now() + (waitInSeconds * 1000);
  var encryptedProof = '';
  encryptedProof += cipher.update(JSON.stringify({
    did: did,
    ip: ip,
    notBefore: notBefore
  }), 'utf8', 'base64');
  encryptedProof += cipher.final('base64');

  return {
    token: encryptedProof,
    waitInSeconds: waitInSeconds
  };
};

/**
 * Checks whether a submitted HTTP Authenticate header contains a valid
 * proof.
 *
 * @param ip the IP address of the token bearer.
 * @param did the DID attempting to be modified for the token bearer.
 * @param token the encrypted token provided by the bearer.
 *
 * @return true if the Authentication proof is valid, false otherwise.
 */
api.isProofTokenValid = function(ip, did, token) {
  if(!token) {
    return false;
  }

  // attempt to decrypt the token
  // TODO: Use a better AES authentication mode like GCM
  var decipher = crypto.createDecipheriv('aes-128-ctr', _proofKey, _proofIv);
  var now = Date.now();
  var decipherText = decipher.update(token, 'base64', 'utf8');
  decipherText += decipher.final('utf8');

  // attempt to parse the decrypted text as JSON
  var decrypted = null;
  try {
    decrypted = JSON.parse(decipherText);
  } catch(err) {
    return false;
  }

  // make sure the IP addresses and DIDs match
  if(ip !== decrypted.ip || did !== decrypted.did) {
    return false;
  }

  // make sure the token is being used in the appropriate time window
  var timeCutoff =
    decrypted.notBefore + (config.authio.proofs.decrementPeriodInSecs * 1000);
  if(!(now > decrypted.notBefore && now < timeCutoff)) {
    return false;
  }

  return true;
};

/**
 * Get the number of active proofs for a given IP address.
 *
 * @param ip The IP address of the block of proofs.
 *
 * @return the number of proofs associated with the IP address.
 */
api.getProofCount = function(ip) {
  var count = 0;

  if(_proofs[ip]) {
    count = _proofs[ip];
  }

  return count;
};

/**
 * Increment the use count on a proof token, removing it if the number of uses
 * exceeds the maximum threshold.
 */
api.incrementProofCount = function(ip) {
  if(!_proofs[ip]) {
    _proofs[ip] = 1;
  } else {
    _proofs[ip] += 1;
  }
  _totalActiveProofs += 1;
};

/**
 * Decrements all active proof values assigned to IPs as well as the
 * total number of active proofs.
 */
function _decrementActiveProofs() {
  var totalDecrements = _.size(_proofs);

  // decrement all IP active proofs by 1, removing entry if the count reaches 0
  _.forEach(_proofs, function(n, key) {
    _proofs[key] -= 1;
    if(_proofs[key] === 0) {
      delete _proofs[key];
    }
  });

  // decrement total active proofs
  _totalActiveProofs -= totalDecrements;
  setTimeout(
    _decrementActiveProofs, config.authio.proofs.decrementPeriodInSecs * 1000);
}

//////////////////////// Bedrock event setup //////////////////////////

bedrock.events.on('bedrock.init', function() {
  setTimeout(
    _decrementActiveProofs, config.authio.proofs.decrementPeriodInSecs * 1000);
});
