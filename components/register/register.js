define([
  'angular',
  'forge/forge',
  'did-io',
  'node-uuid'
], function(angular, forge, didiojs, uuid) {

'use strict';

var module = angular.module('app.register', ['bedrock.alert']);
var didio = didiojs({inject: {
  forge: forge,
  uuid: uuid
}});

module.controller('RegisterController', function(
  $scope, $http, $window, config, DataService, brAlertService) {
  var self = this;

  if(config.data.idp) {
    DataService.set('idpInfo', config.data.idp);
  }
  if(config.data.callback) {
    DataService.set('callback', config.data.callback);
  }

  self.passphraseConfirmation = '';
  self.passphrase = '';
  self.username = '';
  self.registering = false;
  self.generating = false;

  if(!DataService.get('idpInfo')) {
    DataService.redirect('/register/idp-error');
  }

  self.register = function() {
    // TODO: Add more validation checks
    if(self.passphrase != self.passphraseConfirmation) {
      return brAlertService.add('error',
        'The passphrases you entered do not match.');
    }
    if(self.username.length == 0) {
      return brAlertService.add('error',
        'You failed to provide an email address');
    }
    var idpInfo = DataService.get('idpInfo');

    // generate the private key
    self.generating = true;
    var rsa = forge.pki.rsa;
    var keypair = rsa.generateKeyPair({bits: 2048, e: 0x10001});

    // store private key in browser local storage
    // TODO: Encrypt the private key
    localStorage.setItem(hash, JSON.stringify(keypair.privateKey));
    // to retrieve the private key, do the following
    // var privateKey = localStorage.getItem(hash)

    // generate the DID and encrypted DID data
    var hash = didio.generateHash(self.username, self.passphrase);
    var did = didio.generateDid();
    var encryptedDid = didio.encrypt(did, self.passphrase);
    self.generating = true;

    // store the hash to encryptedDid mapping
    var mappingData = {
      '@context': 'https://w3id.org/identity/v1',
      id: 'urn:sha256:' + hash,
      cipherData: encryptedDid
    };
    Promise.resolve($http.post('/mappings/', mappingData))
      .then(function(response) {
        if(response.status !== 201) {
          throw response;
        }
      }).then(function() {
        // store the DID document
        var didDocument = {
          '@context': 'https://w3id.org/identity/v1',
          id: did,
          idp: idpInfo,
          publicKeys: [forge.pki.publicKeyToPem(keypair.publicKey)]
        };
        return Promise.resolve($http.post('/dids/', didDocument))
          .then(function(response) {
            if(response.status !== 201) {
              throw response;
            }
            DataService.redirect(DataService.get('idpInfo').url);
            $scope.$apply();
          });
      }).catch(function(err) {
        console.error('Failed to register with the network', err);
        brAlertService.add('error',
          'Failed to register with the network. Try a different email ' +
          'address and passphrase');
        self.registering = false;
      });
  };
});

});
