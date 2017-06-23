/*!
 * authorization.io default configuration.
 *
 * New BSD License (3-clause)
 * Copyright (c) 2015-2016, Digital Bazaar, Inc.
 * Copyright (c) 2015-2016, Accreditrust Technologies, LLC
 * All rights reserved.
 */
var config = require('bedrock').config;
var fs = require('fs');
var path = require('path');

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
config.server.domain = 'authorization.dev';

// express info
config.express.session.secret = 'NOTASECRET';
config.express.session.key = 'authorizationio.sid';
config.express.session.prefix = 'authorizationio.';
config.express.static.push({
  route: '/favicon.ico',
  path: path.join(__dirname, '..', 'static', 'images', 'favicon.ico')
});

// mongodb config
config.mongodb.name = 'authorizationio_dev';
config.mongodb.host = 'localhost';
config.mongodb.port = 27017;
config.mongodb.local.collection = 'authorizationio_dev';
config.mongodb.username = 'authorizationio';
config.mongodb.password = 'password';
config.mongodb.adminPrompt = true;

// authorizationio pseudo package
const rootPath = path.join(__dirname, '..');
config.views.system.packages.push({
  path: path.join(rootPath, 'components'),
  manifest: path.join(rootPath, 'package.json')
});

// load cached contexts
var constants = config.constants;
// Credentials JSON-LD context URL and local copy
constants.CREDENTIALS_CONTEXT_V1_URL = 'https://w3id.org/credentials/v1';
constants.CONTEXTS[constants.CREDENTIALS_CONTEXT_V1_URL] = JSON.parse(
  fs.readFileSync(
    __dirname + '/../static/contexts/credentials-v1.jsonld',
    {encoding: 'utf8'}));
// Identity JSON-LD context URL and local copy
constants.IDENTITY_CONTEXT_V1_URL = 'https://w3id.org/identity/v1';
constants.CONTEXTS[constants.IDENTITY_CONTEXT_V1_URL] = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, '../static/contexts/identity-v1.jsonld'),
    {encoding: 'utf8'}));
// Security JSON-LD context URL and local copy
constants.SECURITY_CONTEXT_V1_URL = 'https://w3id.org/security/v1';
constants.CONTEXTS[constants.SECURITY_CONTEXT_V1_URL] = JSON.parse(
  fs.readFileSync(
    __dirname + '/../static/contexts/security-v1.jsonld',
    {encoding: 'utf8'}));

// common validation schemas
config.validation.schema.paths.push(
  path.join(__dirname, '..', 'schemas')
);

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
// disable demo site warning (TODO: should use a more fine-grained var)
config.views.vars.productionMode = true;
// REST API documentation
config.docs.vars.brand = config.brand.name;
config.docs.vars.baseUri = config.server.baseUri;

// FIXME: this causes this template to be sent with *every* page, we need
// a better approach

// Identity with Cryptographic Key Credential Template
// NOTE: id not set, claim is empty, signature creator not set
config.views.vars.identityWithCryptographicKeyCredentialTemplate = {
  '@context': 'https://w3id.org/identity/v1',
  id: '',
  type: 'Identity',
  credential: [
    {
      '@graph': {
        '@context': 'https://w3id.org/identity/v1',
        id: '',
        type: [
          'Credential',
          'CryptographicKeyCredential'
        ],
        claim: {}
      }
    }
  ]
};

// webpack configuration
config['bedrock-webpack'].configs.push({
  resolve: {
    alias: {
      'authio': path.resolve(__dirname, '../components'),
      'authio-demo': path.resolve(__dirname, '../demo/components')
    }
  }
});

// authorizationio config
config.authio = {};
config.authio.proofs = {};
config.authio.proofs.proofOfPatience = {
  clockToleranceInSecs: 5,
  // key expiration must be longer than token ttl
  keyExpirationInSecs: 300,
  maxActive: 1000,
  maxPerIp: 10,
  decrementPeriodInSecs: 5,
  minWaitTimeInSecs: 20,
  maxWaitTimeInSecs: 30
};
