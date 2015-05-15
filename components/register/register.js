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

  self.passwordConfirmation = '';
  self.password = '';
  self.username = '';
    console.log('DataService.get(idp)', DataService.get('idpInfo'));

  if(!DataService.get('idpInfo')) {
    DataService.redirect('/register/idp-error');
  }

  self.register = function() {
    // TODO: Add more validation checks
    if(self.password != self.passwordConfirmation) {
      return brAlertService.add('error', 'Passwords don\'t match');
    }
    if(self.username.length == 0) {
      return brAlertService.add('error', 'Enter a username');
    }

    var hash = didio.generateHash(self.username, self.password);
    var idpInfo = DataService.get('idpInfo');
    var rsa = forge.pki.rsa;

    console.log('start key generation ');

    $('.container').wrapInner('<div class="spinner"></div>');

    // TODO: Put spinner while key is generating
    var keypair = rsa.generateKeyPair({bits: 2048, e: 0x10001});

    // places private key in browsers local storage
    localStorage.setItem(hash, JSON.stringify(keypair.privateKey));
    // to retrieve the private key, do the following
    // var privateKey = localStorage.getItem(hash)

    var did = didio.generateDid();

    var encryptedDid = didio.encrypt(did, self.password);
    console.log('Final encrypted did', encryptedDid);

    console.log('end key generation');

    // stores the hash to encryptedDid mapping
    var mappingData = {
      '@context': 'https://w3id.org/identity/v1',
      id: 'urn:sha256:' + hash,
      cipherData: encryptedDid
    };
    Promise.resolve($http.post('/mappings/', mappingData))
      .then(function(response) {
        console.log(response);

        // TODO: user string error types not messages for comparison
        if(response.data === 'Failed to create user') {
          brAlertService.add(
            'error', 'Could not create account. Use a different login/pw.');
        } else {
          console.log("Success");
          console.log("idpInfo", DataService.get('idpInfo'));
          DataService.redirect(DataService.get('idpInfo').url);
          $scope.$apply();
        }
    }).then(function() {
      // stores the DID document
      var didDocument = {
        '@context': 'https://w3id.org/identity/v1',
        id: did,
        idp: idpInfo,
        publicKeys: [forge.pki.publicKeyToPem(keypair.publicKey)]
      };
      Promise.resolve($http.post('/dids/', didDocument))
        .then(function(response) {
          console.log(response);
          // TODO: user string error types not messages for comparison
          if(response.data === 'Failed to create user') {
            brAlertService.add(
              'error', 'Could not create account. Use a different login/pw.');
          } else {
            console.log("Success");
            console.log("idpInfo", DataService.get('idpInfo'));
            DataService.redirect(DataService.get('idpInfo').url);
            $scope.$apply();
          }
        });
    });

    /*
      generate public/private key
      generate DID
      create DID document (clientside)
        public key
        DID
        IdP
      rest api call to loginhub to create entry in db -> loginhub.com/storeDID
        server checks work, validity, writes to db
        {hash: DID}
        {DID: DID Document}

  // password encrypted blob / salt / encryption method / number of iterations /

    */
  };
});

});
