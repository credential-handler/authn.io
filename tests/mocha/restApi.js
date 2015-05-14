/*
 * Copyright (c) 2015 The Open Payments Foundation, Inc. All rights reserved.
 */
'use strict';
var config = require('bedrock').config;
var forge = require('node-forge');
var request = require('request');
var uuid = require('node-uuid');
var didio = require('did-io')();

// base URL for tests
var base = config.server.baseUri;

describe('loginhub - REST API', function() {
  describe('/dids', function() {
    var didUrl = null;
    var lhRequest = request.defaults({strictSSL: false});

    it('should support DID document creation', function(done) {
      var did = didio.generateDid();
      var email = did + '@loginhub.dev';
      var passphrase = did + 'password';
      var loginHash = didio.generateHash(email, passphrase);
      var encryptedDid = didio.encrypt(did, passphrase);
      var keypair = forge.pki.rsa.generateKeyPair({bits: 512, e: 0x10001});
      var didDocument = {
        publicKeys: [keypair.publicKey],
      };

      /*
      console.log("CALLING DID", {
          loginHash: loginHash,
          DID: did,
          DIDDocument: didDocument,
          EDID: encryptedDid
        });
      */

      lhRequest({
        url: base + '/dids/',
        method: 'POST',
        json: {
          loginHash: loginHash,
          DID: did,
          DIDDocument: didDocument,
          EDID: encryptedDid
        }}, function(err, res, body) {
          //console.log('body', body, res.statusCode);
          should.not.exist(err);
          res.statusCode.should.equal(201);
          done();
      });
    });
  });
});