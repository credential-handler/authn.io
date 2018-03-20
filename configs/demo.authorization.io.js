/*!
 * authorization.io production configuration.
 *
 * New BSD License (3-clause)
 * Copyright (c) 2015-2018, Digital Bazaar, Inc.
 * Copyright (c) 2015-2016, Accreditrust Technologies, LLC
 * All rights reserved.
 */
const bedrock = require('bedrock');
const config = require('bedrock').config;
const path = require('path');

// common paths
config.paths.cache = path.join(__dirname, '..', '.cache');
config.paths.log = '/var/log/authorization.io';

// core configuration
config.core.workers = 1;
config.core.worker.restart = true;

// master process while starting
config.core.starting.groupId = 'adm';
config.core.starting.userId = 'root';

// master and workers after starting
config.core.running.groupId = 'bedrock';
config.core.running.userId = 'bedrock';

// logging
config.loggers.app.bedrock.enableChownDir = true;
config.loggers.access.bedrock.enableChownDir = true;
config.loggers.error.bedrock.enableChownDir = true;
config.loggers.email.silent = true;

// only run application on HTTP port
bedrock.events.on('bedrock-express.ready', app => {
  // attach express to regular http
  require('bedrock-server').servers.http.on('request', app);
  // cancel default behavior of attaching to HTTPS
  return false;
});

// server info
config.server.port = 8081;
config.server.httpPort = 8080;
config.server.domain = 'demo.authorization.io';
config.server.host = config.server.domain;

// session info
config.express.session.key = 'authio.sid';
config.express.session.prefix = 'authio.';

// view variables
config.views.brand.name = 'Demo authorization.io';
config.views.vars.baseUri = config.server.baseUri;
config.views.vars.title = config.views.brand.name;
config.views.vars.siteTitle = config.views.brand.name;
config.views.vars.supportDomain = config.server.domain;
config.views.vars.style.brand.alt = config.views.brand.name;
config.views.vars.minify = true;

// FIXME: Everything below here is temporary for testing purposes

require('./demo-secrets');

// serve contexts/images/etc
config.express.static.push(path.join(__dirname, '..', 'static'));
// e-tags are valid for at least 15 minutes
config.express.staticOptions = {
  maxAge: 15 * 60 * 1000
};
