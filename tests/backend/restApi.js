/*
 * Copyright (c) 2015 The Open Payments Foundation, Inc. All rights reserved.
 */
'use strict';
var config = require('bedrock').config;
var forge = require('node-forge');
var request = require('request');
var uuid = require('node-uuid');

// base URL for tests
var base = config.server.baseUri;

// generates a unique DID
var generateDid = function() {
  var buffer = new Array(16);
  uuid.v4(null, buffer, 0);
  return 'did:' + uuid.unparse(buffer);
};

// generates a login hash given an email address and passphrase
var generateLoginHash = function(email, passphrase) {
  var md = forge.md.sha256.create();
  md.update(email + passphrase);
  return md.digest().toHex();
};

// encrypts a DID given a password
var encryptDid = function(did, password) {
  var pwKeyHashMethod = 'PKCS5';
  var encryptionMethod = 'AES-GCM';
  var salt = forge.random.getBytesSync(128);
  var numIterations = 5;

  var key = forge.pkcs5.pbkdf2(password, salt, numIterations, 16);

  var iv = forge.random.getBytesSync(16);
  var cipher = forge.cipher.createCipher('AES-GCM', key);

  cipher.start({
    iv: iv, // should be a 12-byte binary-encoded string or byte buffer
    tagLength: 128 // optional, defaults to 128 bits
  });
  cipher.update(forge.util.createBuffer(did));
  cipher.finish();
  var encrypted = forge.util.encode64(cipher.output.getBytes());
  var tag = forge.util.encode64(cipher.mode.tag.getBytes());
  var iv64 = forge.util.encode64(iv);

  var edid = {
    pwKeyHashMethod: pwKeyHashMethod,
    numIterations: numIterations,
    salt: salt,
    encryptionMethod: encryptionMethod,
    authTag: tag,
    key: key,
    iv: iv64,
    encrypted: encrypted
  };

  return edid;
}

describe('loginhub - REST API', function() {
  describe('/dids', function() {
    var didUrl = null;
    var lhRequest = request.defaults({strictSSL: false});

    it('should support DID document creation', function(done) {
      var did = generateDid();
      var email = did + '@loginhub.dev';
      var passphrase = did + 'password';
      var loginHash = generateLoginHash(email, passphrase);
      var encryptedDid = encryptDid(did, passphrase);
      var keypair = forge.pki.rsa.generateKeyPair({bits: 512, e: 0x10001});
      var didDocument = {
        publicKeys: [keypair.publicKey],
      };

      console.log("CALLING DID", {
          loginHash: loginHash,
          DID: did,
          DIDDocument: didDocument,
          EDID: encryptedDid
        });
      lhRequest.post(base + '/dids/', {
          loginHash: loginHash,
          DID: did,
          DIDDocument: didDocument,
          EDID: encryptedDid
        }, function(err, res, body) {
          console.log('body', body);
        should.not.exist(err);
        res.statusCode.should.equal(201);
        should.exist(res.headers['location']);
        didUrl = res.headers['location'];
        done();
      });
    });
  });
});