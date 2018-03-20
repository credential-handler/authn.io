/*!
 * authorization.io test configuration.
 *
 * New BSD License (3-clause)
 * Copyright (c) 2015-2018, Digital Bazaar, Inc.
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

// views
// branding
config.views.brand.name = 'authorization.io Test';
// update view vars
config.views.vars.baseUri = config.server.baseUri;
config.views.vars.title = config.views.brand.name;
config.views.vars.siteTitle = config.views.brand.name;

// serve contexts/images/etc
config.express.static.push(path.join(__dirname, '..', 'static'));
