/*!
 * authorization.io test configuration.
 *
 * New BSD License (3-clause)
 * Copyright (c) 2015-2016, Digital Bazaar, Inc.
 * Copyright (c) 2015-2016, Accreditrust Technologies, LLC
 * All rights reserved.
 */
var config = require('bedrock').config;
var path = require('path');

// location of logs
var _logdir = '/tmp/authorization.io';

// 0 means use # of cpus
config.core.workers = 0;
config.core.restartWorkers = true;

// logging
config.loggers.logdir = _logdir;
config.loggers.app.filename = _logdir + '/authorization.io-test-app.log';
config.loggers.access.filename = _logdir + '/authorization.io-test-access.log';
config.loggers.error.filename = _logdir + '/authorization.io-test-error.log';

// only log critical errors by default
config.loggers.console.level = 'critical';

// server info
config.server.port = 34443;
config.server.httpPort = 34080;
config.server.host = 'authorization.dev:34443';
config.server.baseUri = 'https://' + config.server.host;

// mongodb config
config.mongodb.name = 'authorizationio_test';
config.mongodb.local.collection = 'authorizationio_test';

// mail config
config.mail.vars.baseUri = config.server.baseUri;
config.mail.vars.subject = {
  prefix: '[authorization.io TEST] ',
  identityPrefix: '[authorization.io TEST] '
};
config.mail.vars.service = {
  name: 'authorization.io Dev Test',
  host: config.server.host
};

// views
// branding
config.views.brand.name = 'authorization.io Test';
// update view vars
config.views.vars.baseUri = config.server.baseUri;
config.views.vars.title = config.views.brand.name;
config.views.vars.siteTitle = config.views.brand.name;

// serve demo contexts and vocabs
config.express.static.push(path.join(
  __dirname, '..', 'static'));

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

// mocha tests
config.mocha.tests.push(path.join(__dirname, '..', 'tests', 'mocha'));

// add protractor tests
var protractor = config.protractor.config;
protractor.suites.authorizationio = path.join(
  __dirname, '..', 'tests', 'protractor', 'tests', '**', '*.js');
var prepare = path.join(__dirname, '..', 'tests', 'protractor', 'prepare.js');
protractor.params.config.onPrepare.push(prepare);
protractor.params.config.maxTimeout = 30000;

// lower minimum wait time for proofs
config.authio.proofs.proofOfPatience.minWaitTimeInSecs = 1;
config.authio.proofs.proofOfPatience.maxWaitTimeInSecs = 2;
