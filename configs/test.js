/*!
 * authorization.io test configuration.
 *
 * New BSD License (3-clause)
 * Copyright (c) 2015-2016, Digital Bazaar, Inc.
 * Copyright (c) 2015-2016, Accreditrust Technologies, LLC
 * All rights reserved.
 */
const config = require('bedrock').config;
const os = require('os');
const path = require('path');

// common paths
config.paths.cache = path.join(__dirname, '..', '.cache');
config.paths.log = path.join(os.tmpdir(), 'test.authorization.localhost');

// 0 means use # of cpus
config.core.workers = 0;
config.core.restartWorkers = true;

// only log critical errors by default
config.loggers.console.level = 'critical';

// server info
config.server.port = 34443;
config.server.httpPort = 34080;
config.server.domain = 'authorization.localhost';

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

// serve contexts/images/etc
config.express.static.push(path.join(__dirname, '..', 'static'));

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
