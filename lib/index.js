/*!
 * Main module file for authorization.io.
 *
 * New BSD License (3-clause)
 * Copyright (c) 2015-2016, Digital Bazaar, Inc.
 * Copyright (c) 2015-2016, Accreditrust Technologies, LLC
 * All rights reserved.
 */
const bedrock = require('bedrock');
require('bedrock-docs');
require('bedrock-express');
require('bedrock-mongodb');
require('bedrock-server');
require('bedrock-views');
require('bedrock-webpack');

require('./config');
require('./mappings');
require('./dids');

const api = {};
module.exports = api;

bedrock.events.on('bedrock-express.start', function(app) {
  // TODO: make configurable
  app.set('json spaces', 2);
});
