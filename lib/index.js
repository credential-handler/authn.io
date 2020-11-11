/*!
 * New BSD License (3-clause)
 * Copyright (c) 2015-2018, Digital Bazaar, Inc.
 * Copyright (c) 2015-2016, Accreditrust Technologies, LLC
 * All rights reserved.
 */
require('bedrock');
require('bedrock-express');
require('bedrock-https-agent');
require('bedrock-server');
require('bedrock-views');
require('bedrock-webpack');

require('./config');

require('./http');

const api = {};
module.exports = api;
