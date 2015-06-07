/*
 * Copyright (c) 2015 The Open Payments Foundation, Inc. All rights reserved.
 */
'use strict';
var config = require('bedrock').config;
var didio = require('did-io')();
var forge = require('node-forge');
var request = require('request');

// base URL for tests
var base = config.server.baseUri;
var authioRequest = request.defaults({strictSSL: false});

describe('authorization.io - REST API', function() {
  var did = didio.generateDid();
  var email = did + '@' config.server.domain;
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

  describe('/mappings', function() {
    var newMappingUrl = null;

    it('should support mapping creation', function(done) {
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

  describe('/dids', function() {
    var newDidDocumentUrl = null;

    it('should support DID document creation', function(done) {
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

});