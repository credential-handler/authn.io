/*!
 * authorization.io default configuration.
 *
 * New BSD License (3-clause)
 * Copyright (c) 2015-2018, Digital Bazaar, Inc.
 * Copyright (c) 2015-2016, Accreditrust Technologies, LLC
 * All rights reserved.
 */
const config = require('bedrock').config;
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
config.express.static.push({
  route: '/favicon.ico',
  path: path.join(__dirname, '..', 'static', 'images', 'favicon.ico')
});

// authorizationio pseudo package
const rootPath = path.join(__dirname, '..');
config.views.system.packages.push({
  path: path.join(rootPath, 'components'),
  manifest: path.join(rootPath, 'package.json')
});

// views
// branding
config.views.brand.name = 'authorization.io Development';

// update view vars
config.views.vars.baseUri = config.server.baseUri;
config.views.vars.title = config.views.brand.name;
config.views.vars.siteTitle = config.views.brand.name;
config.views.vars.supportDomain = config.server.domain;
config.views.vars.debug = false;
config.views.vars.footer.show = false;
// FIXME: add logo img
config.views.vars.style.brand.alt = config.views.brand.name;
config.views.vars.style.brand.src = '/images/authorization-io-logo-white.png';
config.views.vars.style.brand.height = '24'; // img Y = 23
config.views.vars.style.brand.width = '201'; // img X = 268
// contact info
config.views.vars.contact.address = {
  label: 'authorizaton.io',
  address:
    '123 FIXME\n' +
    'FIXME, XX 12345\n' +
    'United States of America',
  htmlAddress:
    '123 FIXME<br/>' +
    'FIXME, XX 12345<br/>' +
    'United States of America'
};

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
