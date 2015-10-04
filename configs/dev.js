/*
 * authorization.io development configuration.
 *
 * Copyright (c) 2015 The Open Payments Foundation. All rights reserved.
 */
var bedrock = require('bedrock');
var config = bedrock.config;
var path = require('path');
var _ = require('lodash');

config.views.paths.push(path.join(__dirname, '..', 'tests', 'views'));

// load the development-specific extensions to the site
// FIXME: rename "tests" to "demo"
require('../tests/lib/idp');
require('../tests/lib/issuer');
require('../tests/lib/consumer');

// pseudo bower package for demo idp, issuer, and consumer
config.requirejs.bower.packages.push({
  path: path.join(__dirname, '..', 'tests', 'components'),
  manifest: {
    // FIXME: rename to authio-demo
    name: 'authiodev-components',
    moduleType: 'amd',
    main: './main.js',
    dependencies: {
      angular: '~1.3.0'
    }
  }
});

// serve demo contexts and vocabs
config.express.static.push(path.join(__dirname, '..', 'static'));

// setup to load demo vocabs
config.views.vars['bedrock-angular-credential'] =
  config.views.vars['bedrock-angular-credential'] || {};
config.views.vars['bedrock-angular-credential'].libraries =
  config.views.vars['bedrock-angular-credential'].libraries || {};
config.views.vars['bedrock-angular-credential'].libraries.default = {
  vocabs: [
    config.server.baseUri + '/vocabs/test-v1.jsonld'
  ]
};

// lower minimum wait time for proofs
config.authio.proofs.minWaitTimeInSecs = 2;
config.authio.proofs.maxWaitTimeInSecs = 3;
