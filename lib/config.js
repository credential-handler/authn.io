/*
 * Loginhub default configuration.
 *
 * Copyright (c) 2015 The Open Payments Foundation. All rights reserved.
 */
var config = require('bedrock').config;
var fs = require('fs');
var path = require('path');

// location of configuration files
var _cfgdir = path.join(__dirname, '..');
// location of static resources
var _datadir = path.join(__dirname, '..');
// location of logs
var _logdir = '/tmp/loginhub';
// location of libs
var _libdir = path.join(__dirname, '..', 'lib');

// core
// 0 means use # of cpus
config.core.workers = 1;
config.core.master.title = 'loginhub1d';
config.core.worker.title = 'loginhub1d-worker';
config.core.worker.restart = false;

// logging
config.loggers.app.filename = path.join(_logdir, 'loginhub.dev-app.log');
config.loggers.access.filename = path.join(_logdir, 'loginhub.dev-access.log');
config.loggers.error.filename = path.join(_logdir, 'loginhub.dev-error.log');
config.loggers.email.silent = true;
config.loggers.email.to = ['cluster@loginhub.com'];
config.loggers.email.from = 'cluster@loginhub.com';

// server info
config.server.port = 33443;
config.server.httpPort = 33080;
config.server.bindAddr = ['loginhub.dev'];
config.server.domain = 'loginhub.dev';
config.server.host = 'loginhub.dev:33443';
config.server.baseUri = 'https://' + config.server.host;

// express info
config.express.session.secret = 'NOTASECRET';
config.express.session.key = 'loginhub.sid';
config.express.session.prefix = 'loginhub.';

// mongodb config
config.mongodb.name = 'loginhub_dev';
config.mongodb.host = 'localhost';
config.mongodb.port = 27017;
config.mongodb.local.collection = 'loginhub_dev';
config.mongodb.username = 'loginhub';
config.mongodb.password = 'password';
config.mongodb.adminPrompt = true;

// requirejs
// loginhub pseudo bower package
config.requirejs.bower.packages.push({
  path: path.join(__dirname, '../components'),
  manifest: {
    name: 'components',
    moduleType: 'amd',
    main: './main.js',
    dependencies: {
      angular: '~1.3.0'
    }
  }
});

// views
// branding
config.views.brand.name = 'Loginhub Development';
// view paths
config.views.paths.push(path.join(__dirname, '../views'));
// add routes
// - string: '/foo/bar' -> site/views/foo/bar.tpl
// - array: ['/foo', '/foo/index.tpl'] -> site/views/foo/index.tpl
config.views.routes.push(['/cc', 'index.html']);
config.views.routes.push(['/idp', 'index.html']);
config.views.routes.push(['/register', 'index.html']);
config.views.routes.push(['/create-alias', 'index.html']);
config.views.routes.push(['/register/idp-error', 'index.html']);
config.views.routes.push(['/new-device', 'index.html']);

// update view vars
config.views.vars.baseUri = config.server.baseUri;
config.views.vars.title = config.views.brand.name;
config.views.vars.siteTitle = config.views.brand.name;
config.views.vars.supportDomain = config.server.domain;
config.views.vars.debug = false;
// FIXME: add logo img
config.views.vars.style.brand.alt = config.views.brand.name;
config.views.vars.style.brand.src = null;//'/img/loginhub.png';
//config.website.views.vars.style.brand.height = '24';
//config.website.views.vars.style.brand.width = '25';
// contact info
config.views.vars.contact.address = {
  label: 'The Open Payments Foundation',
  address:
    '123 FIXME\n' +
    'FIXME, XX 12345\n' +
    'United States of America',
  htmlAddress:
    '123 FIXME<br/>' +
    'FIXME, XX 12345<br/>' +
    'United States of America'
};
// ignore server-side views
// FIXME: change 'components' to 'loginhub'
config.views.angular.optimize.templates.packages['components'] = {
  src: [
    '**/*.html',
    '!node_modules/**/*.html',
    '!bower_components/**/*.html',
    '!views/**/*.html'
  ]
};
// REST API documentation
config.docs.vars.brand = config.brand.name;
config.docs.vars.baseUri = config.server.baseUri;

// loginhub config
config.loginhub = {};
