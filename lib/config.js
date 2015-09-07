/*
 * authorization.io default configuration.
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
var _logdir = '/tmp/authorization.io';
// location of libs
var _libdir = path.join(__dirname, '..', 'lib');

// core
// 0 means use # of cpus
config.core.workers = 1;
config.core.master.title = 'authio1d';
config.core.worker.title = 'authio1d-worker';
config.core.worker.restart = false;

// logging
config.loggers.app.filename =
  path.join(_logdir, 'authorization.dev-app.log');
config.loggers.access.filename =
  path.join(_logdir, 'authorization.dev-access.log');
config.loggers.error.filename =
  path.join(_logdir, 'authorization.dev-error.log');
config.loggers.email.silent = true;
config.loggers.email.to = ['cluster@authorization.io'];
config.loggers.email.from = 'cluster@authorization.io';

// server info
config.server.port = 33443;
config.server.httpPort = 33080;
config.server.bindAddr = ['authorization.dev'];
config.server.domain = 'authorization.dev';
config.server.host = 'authorization.dev:33443';
config.server.baseUri = 'https://' + config.server.host;

// express info
config.express.session.secret = 'NOTASECRET';
config.express.session.key = 'authorizationio.sid';
config.express.session.prefix = 'authorizationio.';

// mongodb config
config.mongodb.name = 'authorizationio_dev';
config.mongodb.host = 'localhost';
config.mongodb.port = 27017;
config.mongodb.local.collection = 'authorizationio_dev';
config.mongodb.username = 'authorizationio';
config.mongodb.password = 'password';
config.mongodb.adminPrompt = true;

// requirejs
// authorizationio pseudo bower package
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

// load identity context
var constants = config.constants;
constants.IDENTITY_CONTEXT_V1_URL = 'https://w3id.org/identity/v1';
constants.CONTEXTS[constants.IDENTITY_CONTEXT_V1_URL] = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, '../contexts/identity-v1.jsonld'),
    {encoding: 'utf8'}));
// Security JSON-LD context URL and local copy
constants.SECURITY_CONTEXT_V1_URL = 'https://w3id.org/security/v1';
constants.CONTEXTS[constants.SECURITY_CONTEXT_V1_URL] = JSON.parse(
  fs.readFileSync(
    __dirname + '/../contexts/security-v1.jsonld',
    {encoding: 'utf8'}));

// views
// branding
config.views.brand.name = 'authorization.io Development';
// view paths
config.views.paths.push(path.join(__dirname, '../views'));
// add routes
// - string: '/foo/bar' -> site/views/foo/bar.tpl
// - array: ['/foo', '/foo/index.tpl'] -> site/views/foo/index.tpl
config.views.routes.push(['/new-device', 'index.html']);

// update view vars
config.views.vars.CONTEXTS = constants.CONTEXTS;
config.views.vars.baseUri = config.server.baseUri;
config.views.vars.title = config.views.brand.name;
config.views.vars.siteTitle = config.views.brand.name;
config.views.vars.supportDomain = config.server.domain;
config.views.vars.debug = false;
// FIXME: add logo img
config.views.vars.style.brand.alt = config.views.brand.name;
config.views.vars.style.brand.src = null;//'/img/authorizationio.png';
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
// FIXME: change 'components' to 'authorizationio'
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

// Identity with Cryptographic Key Credential Template
// NOTE: id not set, claim is empty, signature creator not set
config.views.vars.identityWithCryptographicKeyCredentialTemplate = {
  "@context":[
    "https://w3id.org/identity/v1",
    "https://w3id.org/credentials/v1"
  ],
  "id":"",
  "credential":[
    {
      "@graph": {
        "@context":"https://w3id.org/credentials/v1",
        "type":[
          "Credential",
          "sec:CryptographicKeyCredential"
        ],
        "claim":{},
        "signature": {
          "type": "GraphSignature2012",
          "created": "2015-01-01T01:02:03Z",
          "creator": "",
          "signatureValue": "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz01234567890ABCDEFGHIJKLM=="
        }
      }
    }
  ],
  "signature": {
    "type": "GraphSignature2012",
    "created": "2015-01-01T01:02:03Z",
    "creator": "",
    "signatureValue": "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz01234567890ABCDEFGHIJKLM=="
  }
};

// authorizationio config
config.authio = {};
config.authio.proofs = {
  maxActive: 1000,
  maxPerIp: 10,
  decrementPeriodInSecs: 5,
  minWaitTimeInSecs: 20,
  maxWaitTimeInSecs: 30
};
