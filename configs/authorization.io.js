/*
 * authorization.io production configuration.
 *
 * Copyright (c) 2015 The Open Payments Foundation. All rights reserved.
 */
var config = require('bedrock').config;
var path = require('path');

// location of configuration files
var _cfgdir = path.join(__dirname, '..');

// location of static resources
var _datadir = path.join(__dirname, '..');

// location of logs
var _logdir = '/var/log/authorization.io';

// app info
// 0 means use # of cpus
config.app.workers = 0;
config.app.restartWorkers = true;
config.app.user.groupId = 'authorizationio';
config.app.user.userId = 'authorizationio';

// config environment
config.environment = 'sandbox';

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
config.server.session.secret = '';
config.server.session.key = 'authio.sid';
config.server.session.prefix = 'authio.';

// limiter config
config.limiter.ipRequestsPerHour = 15000;

// database config
config.database.name = 'authorization_io';
config.database.host = 'localhost';
config.database.port = 27017;
config.database.username = 'authorizationio';
config.database.password = '';
config.database.adminPrompt = false;
config.database.local.collection = 'authorization_io';

// FIXME: Everything below here is temporary for testing purposes

config.views.paths.push(path.join(__dirname, '..', 'tests', 'views'));

// load the development-specific extensions to the site
require('../tests/lib/idp');
require('../tests/lib/issuer');
require('../tests/lib/consumer');
// pseudo bower package for idp and consumer
config.requirejs.bower.packages.push({
  path: path.join(__dirname, '..', 'tests', 'components'),
  manifest: {
    name: 'authiodev-components',
    moduleType: 'amd',
    main: './main.js',
    dependencies: {
      angular: '~1.3.0'
    }
  }
});

// bootstrap the Angular application so routes work
config.views.routes.push(['/idp', 'index.html']);
config.views.routes.push(['/issuer', 'issuer/credentials.html']);

require('./authorization.io-secrets');
