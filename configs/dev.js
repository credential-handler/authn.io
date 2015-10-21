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

// load the demo extensions to the site
require('../demo/lib/idp');
require('../demo/lib/issuer');

// pseudo bower package for demo idp, issuer, and consumer
config.requirejs.bower.packages.push({
  path: path.join(__dirname, '..', 'demo', 'components'),
  manifest: {
    name: 'authio-demo',
    moduleType: 'amd',
    main: './main.js',
    dependencies: {
      angular: '~1.3.0'
    }
  }
});

// serve demo contexts and vocabs
config.express.static.push(path.join(__dirname, '..', 'static'));

// setup to load contexts locally
config.views.vars.contextMap[config.constants.SECURITY_CONTEXT_V1_URL] =
  config.server.baseUri + '/contexts/security-v1.jsonld';
config.views.vars.contextMap[config.constants.IDENTITY_CONTEXT_V1_URL] =
  config.server.baseUri + '/contexts/identity-v1.jsonld';
config.views.vars.contextMap[config.constants.CREDENTIALS_CONTEXT_V1_URL] =
  config.server.baseUri + '/contexts/credentials-v1.jsonld';

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
