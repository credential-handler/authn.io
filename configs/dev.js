/*
 * authorization.io test configuration.
 *
 * Copyright (c) 2015 The Open Payments Foundation. All rights reserved.
 */
var bedrock = require('bedrock');
var config = bedrock.config;
var path = require('path');
var forge = require('node-forge');
var database = require('bedrock-mongodb');
var async = require('async');
var _ = require('lodash');

config.views.paths.push(path.join(__dirname, '..', 'tests', 'views'));

// load the development-specific extensions to the site
require('../tests/lib/idp');
require('../tests/lib/issuer');
require('../tests/lib/consumer');
// pseudo bower package for idp and consumer
config.requirejs.bower.packages.push({
  path: path.join(__dirname, '..', 'tests', 'components'),
  manifest: {
    name: 'authiodev-components',
    moduleType: 'amd',
    main: './main.js',
    dependencies: {
      angular: '~1.3.0'
    }
  }
});

// bootstrap the Angular application so routes work
config.views.routes.push(['/idp', 'index.html']);
config.views.routes.push(['/issuer', 'issuer/credentials.html']);

// serve demo contexts and vocabs
config.express.static.push(path.join(
  __dirname, '..', 'static'));

// setup to load demo vocabs
config.views.vars['bedrock-angular-credential'] =
  config.views.vars['bedrock-angular-credential'] || {};
config.views.vars['bedrock-angular-credential'].libraries =
  config.views.vars['bedrock-angular-credential'].libraries || {};
config.views.vars['bedrock-angular-credential'].libraries.default = {
  vocabs: [
    config.server.baseUri + '/vocabs/test-v1.jsonld'
  ]
};

// lower minimum wait time for proofs
config.authio.proofs.minWaitTimeInSecs = 2;
config.authio.proofs.maxWaitTimeInSecs = 3;

// mock IdP keypair
var gIdPKeypair = null;
// this information must match the config of bedrock-idp
var devIdp = {
  did: 'did:291f1b71-de7f-45de-9b6d-9eecc335ecf3',
  baseUri: 'https://bedrock-idp.dev:36443'
};

bedrock.events.on('bedrock-mongodb.ready', function(callback) {
  async.waterfall([
    function(callback) {
      database.openCollections(['didDocument'], callback);
    },
    function(callback) {
      // insert the mock IdP DID document
      gIdPKeypair = forge.pki.rsa.generateKeyPair({bits: 512});
      var now = Date.now();
      database.collections.didDocument.update({
        id: database.hash(devIdp.did)
      }, {
        id: database.hash(devIdp.did),
        meta: {
          created: now,
          updated: now
        },
        didDocument: {
          '@context': 'https://w3id.org/identity/v1',
          id: devIdp.did,
          // TODO: change to `url: devIdp.url`, use to look up services
          credentialsRequestUrl:
            devIdp.baseUri + '/tasks/credentials/compose-identity',
          storageRequestUrl:
            devIdp.baseUri + '/tasks/credentials/request-credential-storage',
          accessControl: {
            writePermission: [{
              id: devIdp.did + '/keys/1',
              type: 'CryptographicKey'
            }]
          },
          publicKey: [{
            id: devIdp.did + '/keys/1',
            type: 'CryptographicKey',
            owner: devIdp.did,
            publicKeyPem: forge.pki.publicKeyToPem(gIdPKeypair.publicKey)
          }]
        }
      }, _.assign({}, database.writeOptions, {upsert:true, multi:false}),
        function(err, doc) {
        if(err) {
          console.log('Failed to set IDP document:', err, doc);
        }
        callback();
      });
    }], callback);
});
