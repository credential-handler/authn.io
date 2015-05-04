/*
 * Loginhub test configuration.
 *
 * Copyright (c) 2015 The Open Payments Foundation. All rights reserved.
 */
var config = require('bedrock').config;
var path = require('path');

// location of logs
var _logdir = '/tmp/loginhub';

// 0 means use # of cpus
config.core.workers = 0;
config.core.restartWorkers = true;

// logging
config.loggers.logdir = _logdir;
config.loggers.app.filename = _logdir + '/loginhub-test-app.log';
config.loggers.access.filename = _logdir + '/loginhub-test-access.log';
config.loggers.error.filename = _logdir + '/loginhub-test-error.log';

// only log critical errors by default
config.loggers.console.level = 'critical';

// server info
config.server.port = 34443;
config.server.httpPort = 34080;
config.server.host = 'loginhub.dev:34443';
config.server.baseUri = 'https://' + config.server.host;

// mongodb config
config.mongodb.name = 'loginhub_test';
config.mongodb.local.collection = 'loginhub_test';

// mail config
config.mail.vars.baseUri = config.server.baseUri;
config.mail.vars.subject = {
  prefix: '[LOGINHUB TEST] ',
  identityPrefix: '[LOGINHUB TEST] '
};
config.mail.vars.service = {
  name: 'Loginhub Dev Test',
  host: config.server.host
};

// views
// branding
config.views.brand.name = 'Loginhub Test';
// update view vars
config.views.vars.baseUri = config.server.baseUri;
config.views.vars.title = config.views.brand.name;
config.views.vars.siteTitle = config.views.brand.name;

// mocha tests
config.mocha.tests.push(path.join(__dirname, '..', 'tests', 'backend'));

// protractor tests
config.protractor.config.suites['loginhub'] = 
  path.join(__dirname, '..', 'tests', 'frontend', '**', '*.js');