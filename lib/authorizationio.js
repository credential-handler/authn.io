/*
 * Main module file for authorization.io.
 *
 * Copyright (c) 2015 The Open Payments Foundation. All rights reserved.
 */
require('bedrock');
require('bedrock-docs');
require('bedrock-express');
require('bedrock-mail');
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
