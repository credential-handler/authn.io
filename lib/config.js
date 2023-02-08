/*!
 * New BSD License (3-clause)
 * Copyright (c) 2015-2023, Digital Bazaar, Inc.
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

// special static paths
config.express.static.push({
  route: '/favicon.ico',
  path: path.join(__dirname, '..', 'web', 'images', 'favicon.ico')
});

// authn.io pseudo package
const rootPath = path.join(__dirname, '..');
config.views.bundle.packages.push({
  path: path.join(rootPath, 'web'),
  manifest: path.join(rootPath, 'package.json')
});

// authnio config
config.authnio = {};
