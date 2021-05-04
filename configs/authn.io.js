/*!
 * authn.io production configuration.
 *
 * New BSD License (3-clause)
 * Copyright (c) 2015-2021, Digital Bazaar, Inc.
 * Copyright (c) 2015-2016, Accreditrust Technologies, LLC
 * All rights reserved.
 */
const {config} = require('bedrock');
const path = require('path');

// common paths
config.paths.cache = '/var/cache/authn.io';
config.paths.log = '/var/log/authn.io';

// core configuration
config.core.workers = 1;
config.core.worker.restart = true;

// master process while starting
config.core.starting.groupId = 'adm';
config.core.starting.userId = 'root';

// master and workers after starting
config.core.running.groupId = 'authnio';
config.core.running.userId = 'authnio';

// logging
config.loggers.app.bedrock.enableChownDir = true;
config.loggers.access.bedrock.enableChownDir = true;
config.loggers.error.bedrock.enableChownDir = true;

// server info
config.server.port = 443;
config.server.httpPort = 80;
config.server.domain = 'authn.io';
