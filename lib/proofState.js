/*
 * The module interface file for shared proof state.
 *
 * Copyright (c) 2015-2016 Digital Bazaar, Inc. All rights reserved.
 */
var _ = require('lodash');
var async = require('async');
var bedrock = require('bedrock');
var database = require('bedrock-mongodb');
var BedrockError = bedrock.util.BedrockError;

var logger = bedrock.loggers.get('app');

var api = {};
module.exports = api;

/**
 * Inserts the state information for a proof type.
 *
 * @param id the ID of the proof type.
 * @param state the new state information.
 * @param callback(err, record) called once the operation completes.
 */
api.insert = function(id, state, callback) {
  var now = Date.now();
  var record = {
    id: database.hash(id),
    meta: {
      created: now,
      updated: now
    },
    state: state
  };
  database.collections.proof.insert(
    record, database.writeOptions, function(err, result) {
    if(err) {
      if(database.isDuplicateError(err)) {
        return callback(new BedrockError(
          'The proof state is a duplicate and could not be added.',
          'DuplicateProofState', {
            proof: id,
            httpStatusCode: 409,
            'public': true
          }));
      }
      logger.error('Mongo error when trying to insert proof state.', err);
      return callback(new BedrockError(
        'Failed to insert proof state due to internal error.',
        'InternalError',
        {proof: id, httpStatusCode: 500, 'public': true},
        err));
    }
    callback(null, result.ops[0]);
  });
};

/**
 * Updates the state information for a proof type.
 *
 * @param id the ID of the proof type.
 * @param state the new state information.
 * @param callback(err, updated) called once the operation completes.
 */
api.update = function(id, state, options, callback) {
  if(typeof options === 'function') {
    callback = options;
    options = {};
  }
  options = options || {};
  var query = _.assign({}, options.query || {});
  query.id = database.hash(id);
  database.collections.proof.update(
    query, {
      $set: {
        'meta.updated': Date.now(),
        'state': state
      }
    }, database.writeOptions, function(err, result) {
    if(err) {
      logger.error('Mongo error when trying to update proof state.', err);
      return callback(new BedrockError(
        'Failed to update proof state due to internal error.',
        'InternalError',
        {proof: id, httpStatusCode: 500, 'public': true},
        err));
    }
    callback(null, result.result.n > 0);
  });
};

/**
 * Gets the state information for a proof type.
 *
 * @param id the ID of the proof type.
 * @param callback(err, state, meta) called once the operation completes.
 */
api.get = function(id, callback) {
  database.collections.proof.findOne(
    {id: database.hash(id)}, {state: true}, function(err, record) {
    if(err) {
      logger.error('Mongo error when trying to find proof state.', err);
      return callback(new BedrockError(
        'Failed to find proof state due to internal error.',
        'InternalError',
        {proof: id, httpStatusCode: 500, 'public': true}, err));
    }
    if(!record) {
      return callback(new BedrockError(
        'Proof state not found.',
        'NotFound',
        {proof: id, httpStatusCode: 404, 'public': true}));
    }
    callback(null, record.state, record.meta);
  });
};

//////////////////////// Bedrock event setup //////////////////////////

bedrock.events.on('bedrock-mongodb.ready', function(callback) {
  async.waterfall([
    function(callback) {
      database.openCollections(['proof'], callback);
    },
    function(callback) {
      database.createIndexes([{
        collection: 'proof',
        fields: {id: 1},
        options: {unique: true, background: false}
      }], callback);
  }], callback);
});
