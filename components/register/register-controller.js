define([
  'underscore', 'async', 'forge/js/forge', 'did-io', 'node-uuid', 'jsonld',
  'jsonld-signatures'],
function(_, async, forge, didiojs, uuid, jsonld, jsigjs) {

'use strict';

/* @ngInject */
function factory($http, $location, $scope, brAlertService, config) {
  var self = this;
  self.passphraseConfirmation = '';
  self.passphrase = '';
  self.username = '';
  self.loading = false;
  self.registering = false;
  self.generating = false;
  self.display = {};
  self.display.form = true;
  self.display.polyfill = false;
  self.polyfillShowHide = 'show';

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

  // get register parameters
  self.loading = true;
  var origin = $location.search().origin;
  var router = new navigator.credentials._Router('params', origin);
  router.request('registerDid').then(function(message) {
    // TODO: handle other parameters
    console.log('message', message);
    self.idp = message.data.idp;
  }).catch(function(err) {
    brAlertService.add('error', err);
  }).then(function() {
    self.loading = false;
    $scope.$apply();
  });

  /**
   * Validates the form, and if valid, performs a registration
   */
  self.validateForm = function() {
    if($scope.regForm.$valid) {
      _register();
    }
  };

  self.togglePolyfill = function() {
    self.display.polyfill = self.display.polyfill === false ? true : false;
    self.polyfillShowHide = self.polyfillShowHide === 'show' ? 'hide' : 'show';
  };

  /**
   * Registers a decentralized identifier, creating a mapping in the
   * process as well as an email credential.
   */
  function _register() {
    var idp = self.idp;
    var keypair = null;
    var did = didio.generateDid();
    var hash = didio.generateHash(self.username, self.passphrase);
    var mappingData = {};
    var didDocument = {};
    var registrationError = false;

    self.generating = true;
    self.secondsLeft = 0;

    var identities = localStorage.getItem('identities');
    if(!identities) {
      identities = [];
    } else {
      try {
        identities = JSON.parse(identities);
      } catch(err) {
        return console.log('Error: Failed to parse existing identities.');
      }
    }

    // TODO: this code needs to be reorganized into smaller more comprehensible
    // functions
    _generateKeyPair().then(function(kp) {
      keypair = kp;
      // store encrypted private key in browser local storage
      var encryptedPem = forge.pki.encryptRsaPrivateKey(
        keypair.privateKey, self.username + self.passphrase);
      identities.push({
        id: did + '/keys/1',
        owner: did,
        publicKeyPem: forge.pki.publicKeyToPem(keypair.publicKey),
        privateKeyPem: encryptedPem,
        label: self.username
      });
      localStorage.setItem('identities', JSON.stringify(identities));
      self.generating = false;

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
          }]
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
    }).then(function() {
      // sign the didDocument
      return new Promise(function(resolve, reject) {
        jsig.sign(didDocument, {
          privateKeyPem: forge.pki.privateKeyToPem(keypair.privateKey),
          creator: did + '/keys/1'
        }, function(err, signedDidDocument) {
          if(err) {
            return reject(err);
          }
          resolve(signedDidDocument);
        });
      });
    }).then(function(signedDidDocument) {
      didDocument = signedDidDocument;
      // wait until the proof of patience has been established
      return _establishProofOfPatience(didDocument);
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
    }).catch(function(err) {
      registrationError = true;
      console.error('Failed to register with the network', err);
      brAlertService.add('error',
        'Failed to register with the network. Try a different email ' +
        'address and passphrase.');
    }).then(function() {
      self.registering = false;
      self.generating = false;
      if(!registrationError) {
        var router = new navigator.credentials._Router('result', origin);
        router.send('registerDid', didDocument);
      }
      $scope.$apply();
    });
  }

  /**
   * Helper method to generate a keypair asynchronously.
   *
   * @return a promise that resolves to a keypair, or rejects with the error.
   */
  function _generateKeyPair() {
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
   * Helper function to establish a proof of patience for writing a
   * DID document.
   *
   * @return a promise that resolves to the proof, or rejects with the error.
   */
  function _establishProofOfPatience(didDocument) {
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
          _updateSecondsLeft();
          setTimeout(function() {
            var proof = err.headers['www-authenticate'];
            return resolve(proof);
          }, waitTime);
        });
    });
  }

  /**
   * Decrements the number of seconds left for registering.
   */
  function _updateSecondsLeft() {
    $scope.$apply();
    // update the timer every second
    if(self.secondsLeft > 1) {
      setTimeout(_updateSecondsLeft, 1000);
    }
    self.secondsLeft -= 1;
  }
}

return {RegisterController2: factory};

});
