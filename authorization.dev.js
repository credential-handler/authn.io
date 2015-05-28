/*
 * authorization.io development server starter.
 *
 * Copyright (c) 2015 The Open Payments Foundation. All rights reserved.
 */
var bedrock = require('bedrock');
var config = require('bedrock').config;

require('./lib/authorizationio');

config.views.routes.push(['/cc', 'index.html']);
config.views.routes.push(['/idp', 'index.html']);

require('./tests/lib/idp');
require('./tests/lib/consumer');

// configure for tests
bedrock.events.on('bedrock.test.configure', function() {
  require('bedrock-protractor');
  require('./configs/test');
});

bedrock.start();
