/*!
 * authorization.io production configuration.
 *
 * New BSD License (3-clause)
 * Copyright (c) 2015-2018, Digital Bazaar, Inc.
 * Copyright (c) 2015-2016, Accreditrust Technologies, LLC
 * All rights reserved.
 */
const config = require('bedrock').config;
const path = require('path');

// common paths
config.paths.cache = '/var/cache/authorization.io';
config.paths.log = '/var/log/authorization.io';

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
config.loggers.app.bedrock.enableChownDir = true;
config.loggers.access.bedrock.enableChownDir = true;
config.loggers.error.bedrock.enableChownDir = true;
config.loggers.email.silent = true;

// server info
config.server.port = 443;
config.server.httpPort = 80;
config.server.domain = 'authorization.io';

// letsencrypt
config.letsencrypt.domains.push(config.server.domain);
config.letsencrypt.email = 'admin@authorization.io';
config.letsencrypt.mode = 'production';

// session info
config.express.session.key = 'authio.sid';
config.express.session.prefix = 'authio.';

// view variables
config.views.brand.name = 'authorization.io';
config.views.vars.baseUri = config.server.baseUri;
config.views.vars.title = config.views.brand.name;
config.views.vars.siteTitle = config.views.brand.name;
config.views.vars.supportDomain = config.server.domain;
config.views.vars.style.brand.alt = config.views.brand.name;
config.views.vars.minify = true;

// FIXME: Everything below here is temporary for testing purposes

require('./authorization.io-secrets');

// serve contexts/images/etc
config.express.static.push(path.join(__dirname, '..', 'static'));
