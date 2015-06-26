/*
 * authorization.io test configuration.
 *
 * Copyright (c) 2015 The Open Payments Foundation. All rights reserved.
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

// mocha tests
config.mocha.tests.push(path.join(__dirname, '..', 'tests', 'mocha'));

// add protractor tests
var protractor = config.protractor.config;
protractor.suites.authorizationio = path.join(
  __dirname, '..', 'tests', 'protractor', 'tests', '**', '*.js');
var prepare = path.join(__dirname, '..', 'tests', 'protractor', 'prepare.js');
protractor.params.config.onPrepare.push(prepare);

// lower minimum wait time for proofs
config.authio.proofs.minWaitTimeInSecs = 1;
config.authio.proofs.maxWaitTimeInSecs = 2;
