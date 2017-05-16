/*!
 * authorization.io production configuration.
 *
 * New BSD License (3-clause)
 * Copyright (c) 2015-2016, Digital Bazaar, Inc.
 * Copyright (c) 2015-2016, Accreditrust Technologies, LLC
 * All rights reserved.
 */
const bedrock = require('bedrock');
var config = require('bedrock').config;
var path = require('path');

// common paths
config.paths.cache = '/var/cache/authorization.io';
config.paths.log = '/var/log/authorization.io';

// core configuration
config.core.workers = 1;
config.core.worker.restart = true;

// master process while starting
config.core.starting.groupId = 'adm';
config.core.starting.userId = 'root';

// master and workers after starting
config.core.running.groupId = 'bedrock';
config.core.running.userId = 'bedrock';

// logging
config.loggers.app.bedrock.enableChownDir = true;
config.loggers.access.bedrock.enableChownDir = true;
config.loggers.error.bedrock.enableChownDir = true;
config.loggers.email.silent = true;

// only run application on HTTP port
bedrock.events.on('bedrock-express.ready', function(app) {
  // attach express to regular http
  require('bedrock-server').servers.http.on('request', app);
  // cancel default behavior of attaching to HTTPS
  return false;
});

// server info
config.server.port = 8081;
config.server.httpPort = 8080;
config.server.domain = 'demo.authorization.io';
config.server.host = config.server.domain;

// session info
config.express.session.key = 'authio.sid';
config.express.session.prefix = 'authio.';

// database config
config.mongodb.name = 'demo_authorization_io';
config.mongodb.host = 'localhost';
config.mongodb.port = 27017;
config.mongodb.username = 'authorizationio';
config.mongodb.adminPrompt = false;
config.mongodb.local.collection = 'demo_authorization_io';

// view variables
config.views.brand.name = 'Demo authorization.io';
config.views.vars.baseUri = config.server.baseUri;
config.views.vars.title = config.views.brand.name;
config.views.vars.siteTitle = config.views.brand.name;
config.views.vars.supportDomain = config.server.domain;
config.views.vars.style.brand.alt = config.views.brand.name;
config.views.vars.minify = true;

// FIXME: Everything below here is temporary for testing purposes

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

require('./demo-secrets');

// serve demo contexts and vocabs
config.express.static.push(path.join(__dirname, '..', 'static'));
// e-tags are valid for at least 24 hours
config.express.staticOptions = {
  maxAge: 24 * 60 * 60 * 1000
};

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
config.authio.proofs.proofOfPatience.minWaitTimeInSecs = 2;
config.authio.proofs.proofOfPatience.maxWaitTimeInSecs = 3;
