define([
  'underscore', 'async', 'forge/forge', 'did-io', 'node-uuid', 'jsonld',
  'jsonld-signatures'],
function(_, async, forge, didiojs, uuid, jsonld, jsigjs) {

'use strict';

/* @ngInject */
function factory($scope, $http, $location, ipCookie, brAlertService, config) {
  var self = this;
  self.passphraseConfirmation = '';
  self.passphrase = '';
  self.username = '';
  self.registering = false;
  self.generating = false;

  // setup custom document loader for identity JSON-LD context
  jsonld = jsonld();
  var _oldLoader = jsonld.documentLoader;
  jsonld.documentLoader = function(url) {
    if(url in config.data.CONTEXTS) {
      return Promise.resolve({
        contextUrl: null,
        document: config.data.CONTEXTS[url],
        documentUrl: url
      });
    }
    return _oldLoader(url);
  };

  // initialize jsig using the AMD-loaded helper libraries
  var jsig = jsigjs({inject: {
    async: async,
    forge: forge,
    jsonld: jsonld,
    _: _
  }});

  // initialize didio using the AMD-loaded helper libraries
  var didio = didiojs({inject: {
    forge: forge,
    uuid: uuid
  }});

  /**
   * Helper method to generate a keypair asynchronously.
   *
   * @return a promise that resolves to a keypair, or rejects with the error.
   */
  self._generateKeyPair = function() {
    return new Promise(function(resolve, reject) {
      forge.pki.rsa.generateKeyPair({
        bits: 2048,
        workerScript: '/bower-components/forge/js/prime.worker.js'
      }, function(err, keypair) {
        if(err) {
          return reject(err);
        }
        return resolve(keypair);
      });
    });
  }

  /**
   * Decrements the number of seconds left for registering.
   */
  self._updateSecondsLeft = function() {
    $scope.$apply();
    // update the timer every second
    if(self.secondsLeft > 1) {
      setTimeout(self._updateSecondsLeft, 1000);
    }
    self.secondsLeft -= 1;
  }

  /**
   * Helper function to establish a proof of patience for writing a
   * DID document.
   *
   * @return a promise that resolves to the proof, or rejects with the error.
   */
  self._establishProofOfPatience = function(didDocument) {
    return new Promise(function(resolve, reject) {
      return Promise.resolve($http.post('/dids/', didDocument, {
        transformResponse: function(data, headers, status) {
          return {
            status: status,
            headers: {
              'retry-after': parseInt(headers('retry-after'), 10),
              'www-authenticate': headers('www-authenticate')
            },
            data: data
          };
        }})).then(function(response) {
          // expecting a 401 HTTP error code, so a success of any kind is bad
          return reject(response);
        }).catch(function(err) {
          // expect 401 unauthorized and a proof-of-patience challenge
          if(err.status !== 401) {
            return reject(err);
          }

          // wait for as long as the proof of patience requires
          self.secondsLeft = err.headers['retry-after'];
          var waitTime = self.secondsLeft * 1000;
          self.registering = true;
          self._updateSecondsLeft();
          setTimeout(function() {
            var proof = err.headers['www-authenticate'];
            return resolve(proof);
          }, waitTime);
        });
    });
  }

  /**
   * Validates the form, and if valid, performs a registration
   */
  self.validateForm = function() {
    if($scope.regForm.$valid) {
      self.register();
    }
  };

  /**
   * Registers a decentralized identifier, creating a mapping in the
   * process as well as an email credential.
   */
  self.register = function() {
    var idp = 'did:d1d1d1d1-d1d1-d1d1-d1d1-d1d1d1d1d1d1';
    var keypair = null;
    var did = null;
    var hash = didio.generateHash(self.username, self.passphrase);
    var mappingData = {};
    var didDocument = {};

    self.generating = true;
    self.secondsLeft = 0;

    self._generateKeyPair().then(function(kp) {
      keypair = kp;
      // store encrypted private key in browser local storage
      var encryptedPem = forge.pki.encryptRsaPrivateKey(
        keypair.privateKey, self.username + self.passphrase);
      localStorage.setItem(hash, encryptedPem);
      self.generating = false;

      // generate the DID
      did = didio.generateDid();

      // create the DID document
      didDocument = {
        '@context': 'https://w3id.org/identity/v1',
        id: did,
        idp: idp,
        accessControl: {
          writePermission: [{
            id: did + '/keys/1',
            type: 'CryptographicKey'
          }, {
            id: idp,
            type: 'Identity'
          }],
        },
        publicKey: [{
          id: did + '/keys/1',
          type: 'CryptographicKey',
          owner: did,
          publicKeyPem: forge.pki.publicKeyToPem(keypair.publicKey)
        }]
      };

      // create the mapping document
      mappingData = {
        '@context': 'https://w3id.org/identity/v1',
        id: hash,
        did: did,
        accessControl: {
          writePermission: [{
            id: did + '/keys/1',
            type: 'CryptographicKey'
          }]
        }
      };

      // wait until the proof of patience has been established
      return self._establishProofOfPatience(didDocument);
    }).then(function(proof) {
      // use the proof of patience to register the DID
      return Promise.resolve($http.post('/dids/', didDocument, {
        headers: {
          authorization: proof
        }
      })).then(function(response) {
        if(response.status !== 201) {
          throw response;
        }
      });
    }).then(function() {
      // sign the mapping data
      return new Promise(function(resolve, reject) {
        jsig.sign(mappingData, {
          privateKeyPem: forge.pki.privateKeyToPem(keypair.privateKey),
          creator: did + '/keys/1'
        }, function(err, signedMappingData) {
          if(err) {
            return reject(err);
          }
          resolve(signedMappingData);
        });
      });
    }).then(function(signedMappingData) {
      // register the mapping document
      return Promise.resolve($http.post('/mappings/', signedMappingData));
    }).then(function(response) {
      if(response.status !== 201) {
        throw response;
      }
    }).then(function() {
      ipCookie('did', did);
      var emailCredential = {
        '@context': 'https://w3id.org/identity/v1',
        id: did,
        assertion: [{
          credential: {
            '@context': 'https://w3id.org/identity/v1',
            type: 'EmailCredential',
            claim: {
              id: did,
              email: did + '@example.com'
            }
          }
        }, {
          credential: {
            '@context': 'https://w3id.org/identity/v1',
            type: 'EmailCredential',
            claim: {
              id: did,
              email: did + '@example.org'
            }
          }
        }]
      };
      return Promise.resolve($http.post(
        '/idp/credentials', JSON.stringify(emailCredential)))
        .then(function(response) {
          if(response.status !== 200) {
            throw response;
          }
          $location.path('/');
        });
    }).catch(function(err) {
      console.error('Failed to register with the network', err);
      brAlertService.add('error',
        'Failed to register with the network. Try a different email ' +
        'address and passphrase.');
    }).then(function() {
      self.registering = false;
      self.generating = false;
      $scope.$apply();
    });
  };
}

return {RegisterController: factory};

});
