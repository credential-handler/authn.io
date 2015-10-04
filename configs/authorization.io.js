/*
 * authorization.io production configuration.
 *
 * Copyright (c) 2015 The Open Payments Foundation. All rights reserved.
 */
var config = require('bedrock').config;
var path = require('path');

// location of configuration files
var _cfgdir = path.join(__dirname, '..');

// location of logs
var _logdir = '/var/log/authorization.io';

// core configuration
config.core.workers = 1;
config.core.worker.restart = true;

// master process while starting
config.core.starting.groupId = 'adm';
config.core.starting.userId = 'root';

// master and workers after starting
config.core.running.groupId = 'authorizationio';
config.core.running.userId = 'authorizationio';

// logging
config.loggers.logdir = _logdir;
config.loggers.app.filename = path.join(_logdir, 'authorization.io-app.log');
config.loggers.access.filename = path.join(
  _logdir, 'authorization.io-access.log');
config.loggers.error.filename = path.join(
  _logdir, 'authorization.io-error.log');
config.loggers.email.silent = true;

// server info
config.server.port = 443;
config.server.httpPort = 80;
config.server.bindAddr = ['authorization.io'];
config.server.domain = 'authorization.io';
config.server.host = 'authorization.io';
config.server.baseUri = 'https://' + config.server.host;
config.server.key = path.join(_cfgdir, 'pki', 'authorization.io.key');
config.server.cert = path.join(_cfgdir, 'pki', 'authorization.io.crt');
config.server.ca = path.join(_cfgdir, 'pki', 'authorization.io-bundle.crt');

// session info
config.express.session.key = 'authio.sid';
config.express.session.prefix = 'authio.';

// database config
config.mongodb.name = 'authorization_io';
config.mongodb.host = 'localhost';
config.mongodb.port = 27017;
config.mongodb.username = 'authorizationio';
config.mongodb.adminPrompt = false;
config.mongodb.local.collection = 'authorization_io';

// view variables
config.views.brand.name = 'authorization.io';
config.views.vars.baseUri = config.server.baseUri;
config.views.vars.title = config.views.brand.name;
config.views.vars.siteTitle = config.views.brand.name;
config.views.vars.supportDomain = config.server.domain;
config.views.vars.style.brand.alt = config.views.brand.name;

// FIXME: Everything below here is temporary for testing purposes

// load the development-specific extensions to the site
require('../tests/lib/idp');
require('../tests/lib/issuer');
require('../tests/lib/consumer');

// pseudo bower package for demo idp, issuer, and consumer
config.requirejs.bower.packages.push({
  path: path.join(__dirname, '..', 'tests', 'components'),
  manifest: {
    name: 'authio-demo',
    moduleType: 'amd',
    main: './main.js',
    dependencies: {
      angular: '~1.3.0'
    }
  }
});

require('./authorization.io-secrets');
