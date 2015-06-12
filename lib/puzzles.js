/*
 * The module interface file for guided client network puzzles.
 *
 * Copyright (c) 2015 The Open Payments Foundation. All rights reserved.
 */
var async = require('async');
var bedrock = require('bedrock');
var config = require('bedrock').config;
var crypto = require('crypto');
var database = require('bedrock-mongodb');

// alias for bedrock error
var BedrockError = bedrock.util.BedrockError;
var logger = bedrock.loggers.get('app');

var api = {};
module.exports = api;

/**
 * This module implements a guided client network puzzle to limit the
 * number of DIDs that can be created on the network at any given time.
 *
 * To solve the puzzle, a client must:
 *
 *   1. GET /puzzles
 *      This will either get a puzzle, or tell the client when to try
 *      to get a puzzle in the future (if the IP is being rate limited).
 *      The Location HTTP header will be set to the puzzle ID to GET
 *      next.
 *   2. Wait for the amount of milliseconds specified in the
 *      X-Puzzle HTTP header and then go to the location
 *      specified in the Location header.
 *   3. GET /puzzles/:puzzle
 *      This will either tell the client to start over via a 404, or
 *      it will tell the client to wait for the amount of seconds
 *      specified in the X-Puzzle HTTP header and then
 *      fetch the Location header.
 *   4. Steps 2-3 will be repeated as many times as the server requires
 *      and the X-Puzzle header will be marked as solved when the
 *      steps are completed.
 *
 */

// the maximum number of active puzzles at any given time for an IP
var MAX_PUZZLES_PER_IP = 10;
var PUZZLE_TIMEOUT_IN_SECS = 120;

// the mapping of IPs to puzzles
var gPuzzles = {};

// the puzzle timeout list
var gPuzzleTimeout = [];

// Puzzle database methods

/**
 * Creates a puzzle given an IP address.
 *
 * @param ip the ip address that the puzzle is being assigned to
 *
 * @return a puzzle.
 */
api.createPuzzle = function(ip) {
  // create the entry if it doesn't already exist
  if(!gPuzzles[ip]) {
    gPuzzles[ip] = {};
  }

  var shasum = crypto.createHash('sha1');
  var now = Date.now();
  shasum.update(ip + now);
  var puzzleId = shasum.digest('hex');
  var waitInSeconds = _randomNumber(10, 15);
  var notBefore = now + (waitInSeconds * 1000);
  var puzzle = {
    id: puzzleId,
    clientIp: ip,
    started: now,
    notBefore: notBefore,
    clean: now + (PUZZLE_TIMEOUT_IN_SECS * 1000),
    solved: false,
    used: 0
  };
  gPuzzles[ip][puzzleId] = puzzle;
  gPuzzleTimeout.push(puzzle);

  return puzzle;
};

/**
 * Gets a puzzle given an IP address and a puzzle ID.
 *
 * @param ip the ip address associated with the puzzle.
 * @param puzzleId the ID of the puzzle.
 *
 * @return the puzzle or null if there is no associated puzzle.
api.getPuzzle = function(ip, puzzleId) {
  var puzzle = null;

  if(gPuzzles[ip] && gPuzzles[ip][puzzleId]) {
    puzzle = gPuzzles[ip][puzzleId];
  }

  return puzzle;
};

/**
 * Get the number of puzzles for a given IP address
 *
 * @param ip The IP address of the block of puzzles.
 *
 * @return the number of puzzles associated with the IP address.
 */
api.getPuzzleCount = function(ip) {
  var count = 0;

  if(gPuzzles[ip]) {
    count = Object.keys(gPuzzles[ip]).length;
  }

  return count;
};

/**
 * Calculate the amount of time (in seconds) left to solve a puzzle.
 *
 * @param puzzle the puzzle to use for the calculation.
 *
 * @return the number of seconds left before the puzzle is solved.
 */
api.calculateWaitInSeconds = function(puzzle) {
  var now = Date.now();
  return (1 + Math.floor((puzzle.notBefore - now) / 1000));
};

// Puzzle REST API

bedrock.events.on('bedrock-express.configure.routes', function(app) {
  // TODO: validate params
  /**
   * Gets a guided puzzle to solve.
   *
   * @return a guided puzzle location
   */
  app.get('/puzzles', function(req, res, next) {
    // ensure that less than MAX_PUZZLES_PER_IP are in the puzzle list
    if(api.getPuzzleCount(req.ip) > MAX_PUZZLES_PER_IP) {
      // if there are too many puzzles, wait for 30 seconds and try again
      res.set('Retry-After', _randomNumber(20, 30));
      res.status(503);
      // FIXME: This should probably be a BedrockError, but you can't
      // easily set a header w/ a BedrockError
      return res.send('Your IP address is limited, please try back later.');
    }

    // create the puzzle
    var puzzle = api.createPuzzle(req.ip);

    // respond with the appropriate document
    var waitInSeconds = api.calculateWaitInSeconds(puzzle);
    res.set('X-Puzzle', 'type=deli-counter, id=' + puzzle.id);
    res.set('Retry-After', waitInSeconds);
    res.set('Location', config.server.baseUri + '/puzzles/' + puzzle.id);
    res.status(201);
    res.send();
  });

  // registers a mapping to a piece of data
  app.get('/puzzles/:puzzle', function(req, res, next) {
    var now = Date.now();
    var clientIp = req.ip;
    var puzzleId = req.params.puzzle;
    var puzzle = api.getPuzzle(req.ip, req.params.puzzle);

    if(!puzzle) {
      return next(new BedrockError(
        'The given puzzle was not found for your IP address.',
        'PuzzleNotFound', {
          ip: clientIp, puzzle: puzzleId, httpStatusCode: 404,
          'public': true
      }));
    }

    // check to see if the puzzle has been solved
    if(now > puzzle.notBefore) {
      puzzle.solved = true;
      res.status(200);
    } else {
      var waitInSeconds = api.calculateWaitInSeconds(puzzle);
      res.set('X-Puzzle', 'type=deli-counter, id=' + puzzle.id);
      res.set('Retry-After', waitInSeconds);
      res.set('Location', config.server.baseUri + '/puzzles/' + puzzle.id);
      res.status(503);
    }

    res.send();
  });
});

function _randomNumber(low, high) {
  return Math.floor(Math.random() * (high - low + 1) + low);
}