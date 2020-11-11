/*!
 * authorization.io default configuration.
 *
 * New BSD License (3-clause)
 * Copyright (c) 2015-2018, Digital Bazaar, Inc.
 * Copyright (c) 2015-2016, Accreditrust Technologies, LLC
 * All rights reserved.
 */
const bedrock = require('bedrock');
const cc = bedrock.util.config.main.computer();
const {config} = bedrock;
const path = require('path');

// core
// 0 means use # of cpus
config.core.workers = 1;
config.core.master.title = 'authio1d';
config.core.worker.title = 'authio1d-worker';
config.core.worker.restart = false;

// logging
config.loggers.email.silent = true;
config.loggers.email.to = ['cluster@authorization.io'];
config.loggers.email.from = 'cluster@authorization.io';

// server info
config.server.port = 33443;
config.server.httpPort = 33080;
config.server.domain = 'authorization.localhost';

// express info
config.express.session.secret = 'NOTASECRET';
config.express.session.key = 'authorizationio.sid';
config.express.session.prefix = 'authorizationio.';
// persist session cookie for a year
config.express.session.cookie.maxAge = 365 * 24 * 60 * 60 * 1000;
config.express.static.push({
  route: '/favicon.ico',
  path: path.join(__dirname, '..', 'static', 'images', 'favicon.ico')
});

// authorizationio pseudo package
const rootPath = path.join(__dirname, '..');
config.views.bundle.packages.push({
  path: path.join(rootPath, 'components'),
  manifest: path.join(rootPath, 'package.json')
});

// authorizationio config
config.authnio = {};

// web app manifest cache config
config.authnio.manifestCache = {
  // 100 MiB (roughly, is actually in chars)
  size: 1024 * 1024 * 100,
  // 5 minutes
  ttl: 5 * 60 * 1000,
  // request timeout for fetching a manifest (5 seconds)
  requestTimeout: 5 * 1000
};

cc('authnio.manifestCache.secure',
  () => config['https-agent'].rejectUnauthorized);
