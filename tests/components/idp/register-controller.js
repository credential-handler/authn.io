define(['forge/forge', 'did-io', 'node-uuid'], function(forge, didiojs, uuid) {

'use strict';

var didio = didiojs({inject: {
  forge: forge,
  uuid: uuid
}});

/* @ngInject */
function factory(
  $scope, $http, $location, ipCookie, brAlertService) {
  var self = this;
  self.passphraseConfirmation = '';
  self.passphrase = '';
  self.username = '';
  self.registering = false;
  self.generating = false;

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
    var pki = forge.pki;
    var keypair = null;
    var did = null;
    var hash = didio.generateHash(self.username, self.passphrase);

    new Promise(function(resolve, reject) {
      self.generating = true;
      pki.rsa.generateKeyPair({
        bits: 2048,
        workerScript: '/bower-components/forge/js/prime.worker.js'
      }, function(err, keypair) {
        if(err) {
          return reject(err);
        }
        return resolve(keypair);
      });
    }).then(function(kp) {
      keypair = kp;
      // store encrypted private key in browser local storage
      var encryptedPem =  pki.encryptRsaPrivateKey(
        keypair.privateKey, self.username + self.passphrase);
      localStorage.setItem(hash, encryptedPem);
      self.generating = false;

      // generate the DID
      did = didio.generateDid();

      // store the hash to did mapping
      var mappingData = {
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

      return Promise.resolve($http.post('/mappings/', mappingData));
    }).then(function(response) {
      if(response.status !== 201) {
        throw response;
      }
    }).then(function() {
      // create the DID document
      var didDocument = {
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
    return Promise.resolve($http.post('/dids/', didDocument))
      .then(function(response) {
        if(response.status !== 201) {
          throw response;
        }
      });
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
      }
      return Promise.resolve($http.post('/idp/credentials',
        JSON.stringify(emailCredential)))
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
        'address and passphrase');
      self.generating = false;
      self.registering = false;
    }).then(function() {
      $scope.$apply();
    });
  };
}

return {RegisterController: factory};

});
