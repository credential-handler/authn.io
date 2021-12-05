/*!
 * authn.io default configuration.
 *
 * New BSD License (3-clause)
 * Copyright (c) 2015-2021, Digital Bazaar, Inc.
 * Copyright (c) 2015-2016, Accreditrust Technologies, LLC
 * All rights reserved.
 */
const {config} = require('bedrock');
const path = require('path');

// core
// 0 means use # of cpus
config.core.workers = 1;
config.core.master.title = 'authnio1d';
config.core.worker.title = 'authnio1d-worker';
config.core.worker.restart = false;

// server info
config.server.port = 33443;
config.server.httpPort = 33080;
config.server.domain = 'authn.localhost';
config.server.key = path.join(__dirname, '../ssl/authn.localhost.key');
config.server.cert = path.join(__dirname, '../ssl/authn.localhost.crt');

// express info
config.express.static.push({
  route: '/favicon.ico',
  path: path.join(__dirname, '..', 'static', 'images', 'favicon.ico')
});

config.express.static.push({
  route: '/sw.js',
  file: true,
  path: path.join(__dirname, '..', 'sw', 'sw.js'),
  cors: true
});

// serve contexts/images/etc
config.express.static.push(path.join(__dirname, '..', 'static'));

// authn.io pseudo package
const rootPath = path.join(__dirname, '..');
config.views.bundle.packages.push({
  path: path.join(rootPath, 'components'),
  manifest: path.join(rootPath, 'package.json')
});

// authnio config
config.authnio = {};
