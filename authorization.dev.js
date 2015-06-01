/*
 * authorization.io development server starter.
 *
 * Copyright (c) 2015 The Open Payments Foundation. All rights reserved.
 */
var bedrock = require('bedrock');
var config = require('bedrock').config;
var path = require('path');

require('./lib/authorizationio');
require('./configs/dev');

// configure for tests
bedrock.events.on('bedrock.test.configure', function() {
  require('./configs/test');
});

bedrock.start();
