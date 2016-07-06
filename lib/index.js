/*
 * Main module file for authorization.io.
 *
 * Copyright (c) 2015 The Open Payments Foundation. All rights reserved.
 */
var bedrock = require('bedrock');
require('bedrock-docs');
require('bedrock-express');
require('bedrock-mongodb');
require('bedrock-protractor');
require('bedrock-requirejs');
require('bedrock-server');
require('bedrock-views');

require('./config');
require('./mappings');
require('./dids');
require('./proofs');

var api = {};
module.exports = api;

bedrock.events.on('bedrock-express.start', function(app) {
  // TODO: make configurable
  app.set('json spaces', 2);
});
