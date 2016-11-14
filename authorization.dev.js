/*!
 * authorization.io development server starter.
 *
 * New BSD License (3-clause)
 * Copyright (c) 2015-2016, Digital Bazaar, Inc.
 * Copyright (c) 2015-2016, Accreditrust Technologies, LLC
 * All rights reserved.
 */
var bedrock = require('bedrock');
var config = require('bedrock').config;
var path = require('path');

require('./lib/index');
require('./configs/dev');

// configure for tests
bedrock.events.on('bedrock.test.configure', function() {
  require('./configs/test');
});

bedrock.start();
