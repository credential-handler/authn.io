/*!
 * New BSD License (3-clause)
 * Copyright (c) 2015-2016, Digital Bazaar, Inc.
 * Copyright (c) 2015-2016, Accreditrust Technologies, LLC
 * All rights reserved.
 */
'use strict';
var config = require('bedrock').config;
var didio = require('did-io');
var jsonld = require('jsonld');
var jsig = require('jsonld-signatures')({inject:{jsonld: jsonld}});
var forge = require('node-forge');
var request = require('request');

// base URL for tests
var base = config.server.baseUri;
var authioRequest = request.defaults({strictSSL: false});

// setup a custom loader to load the cached context
var _oldLoader = jsonld.documentLoader;
var _customLoader = function(url, callback) {
  if(url in config.constants.CONTEXTS) {
    return callback(
      null, {
        contextUrl: null,
        document: config.constants.CONTEXTS[url],
        documentUrl: url
      });
  }
  _oldLoader(url, callback);
};
jsonld.documentLoader = _customLoader;

describe('authorization.io - REST API', function() {
  var did = didio.generateDid();
  var email = did + '@' + config.server.domain;
  var passphrase = did + 'password';
  var hash = didio.generateHash(email, passphrase);
  var keypair = forge.pki.rsa.generateKeyPair({bits: 512, e: 0x10001});
  var mapping = {
    '@context': 'https://w3id.org/identity/v1',
    id: hash,
    did: did,
    accessControl: {
      writePermission: [{
        id: did + '/keys/1',
        type: 'CryptographicKey'
      }, {
        id: 'did:d1d1d1d1-d1d1-d1d1-d1d1-d1d1d1d1d1d1',
        type: 'Identity'
      }]
    }
  };
  var didDocument = {
    '@context': 'https://w3id.org/identity/v1',
    id: did,
    idp: config.server.baseUri + '/idp',
    accessControl: {
      writePermission: [{
        id: did + '/keys/1',
        type: 'CryptographicKey'
      }, {
        id: 'did:d1d1d1d1-d1d1-d1d1-d1d1-d1d1d1d1d1d1',
        type: 'Identity'
      }]
    },
    publicKey: [{
      id : did + '/keys/1',
      type: 'CryptographicKey',
      owner: did,
      publicKeyPem: forge.pki.publicKeyToPem(keypair.publicKey)
    }]
  };

  describe('/dids', function() {
    var newDidDocumentUrl = null;
    var proof = '';

    it('should require proof of patience authorization', function(done) {
      authioRequest({
        url: base + '/dids/',
        method: 'POST',
        json: didDocument
      }, function(err, res) {
        should.not.exist(err);
        res.statusCode.should.equal(401);
        should.exist(res.headers['retry-after']);
        should.exist(res.headers['www-authenticate']);

        // wait for proof of patience to be established
        setTimeout(function() {
          proof = res.headers['www-authenticate'];
          done();
        }, parseInt(res.headers['retry-after']) * 1000);
      });
    });

    it('should not support unsigned DID document creation', function(done) {
      /*
      authioRequest({
        url: base + '/dids/',
        method: 'POST',
        json: didDocument
      }, function(err, res) {
        should.not.exist(err);
        res.statusCode.should.equal(201);
        should.exist(res.headers.location);
        newDidDocumentUrl = res.headers.location;
        done();
      });
      */
      // FIXME: implement unsigned checks
      done();
    });

    it('should support signed DID document creation', function(done) {
      jsig.sign(didDocument, {
        privateKeyPem: forge.pki.privateKeyToPem(keypair.privateKey),
        creator: did + '/keys/1'
      }, function(err, signedDidDocument) {
        if(err) {
          return done(err);
        }
        didDocument = signedDidDocument;
        authioRequest({
          url: base + '/dids/',
          method: 'POST',
          headers: {
            authorization: proof
          },
          json: didDocument
        }, function(err, res) {
          should.not.exist(err);
          res.statusCode.should.equal(201);
          should.exist(res.headers.location);
          newDidDocumentUrl = res.headers.location;
          done();
        });
      });
    });

    it('should support DID document retrieval', function(done) {
      authioRequest({
        url: newDidDocumentUrl,
        method: 'GET',
        headers: {
          'accept': 'application/ld+json'
        }
      }, function(err, res, body) {
        should.not.exist(err);
        res.statusCode.should.equal(200);
        JSON.parse(body).should.deep.equal(didDocument);
        done();
      });
    });
  });

  describe('/mappings', function() {
    var newMappingUrl = null;

    it('should not support unsigned mapping creation', function(done) {
      /*
      authioRequest({
        url: base + '/mappings/',
        method: 'POST',
        json: mapping
      }, function(err, res) {
        should.not.exist(err);
        res.statusCode.should.equal(201);
        should.exist(res.headers.location);
        newMappingUrl = res.headers.location;
        done();
      });
      */
      // FIXME: implement this negative test
      done();
    });

    it('should support signed mapping creation', function(done) {
      jsig.sign(mapping, {
        privateKeyPem: forge.pki.privateKeyToPem(keypair.privateKey),
        creator: did + '/keys/1'
      }, function(err, signedMapping) {
        if(err) {
          return done(err);
        }
        mapping = signedMapping;
        authioRequest({
          url: base + '/mappings/',
          method: 'POST',
          json: mapping
        }, function(err, res) {
          should.not.exist(err);
          res.statusCode.should.equal(201);
          should.exist(res.headers.location);
          newMappingUrl = res.headers.location;
          done();
        });
      });
    });

    it('should support mapping retrieval', function(done) {
      authioRequest({
        url: newMappingUrl,
        method: 'GET',
        headers: {
          'accept': 'application/ld+json'
        }
      }, function(err, res, body) {
        should.not.exist(err);
        res.statusCode.should.equal(200);
        JSON.parse(body).should.deep.equal(mapping);
        done();
      });
    });
  });

});
