/*!
 * authnio default configuration.
 *
 * New BSD License (3-clause)
 * Copyright (c) 2015-2021, Digital Bazaar, Inc.
 * Copyright (c) 2015-2016, Accreditrust Technologies, LLC
 * All rights reserved.
 */
const bedrock = require('bedrock');
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
config.express.static.push({
  route: '/favicon.ico',
  path: path.join(__dirname, '..', 'static', 'images', 'favicon.ico')
});

// authnio pseudo package
const rootPath = path.join(__dirname, '..');
config.views.bundle.packages.push({
  path: path.join(rootPath, 'components'),
  manifest: path.join(rootPath, 'package.json')
});

// authnio config
config.authnio = {};
