define([
  'angular',
  'forge/forge',
  'jquery'
], function(angular, forge) {

'use strict';

var module = angular.module('authio.new-device', []);

module.controller('NewDeviceController', function($scope, DataService, $http) {
  var self = this;
  var idp = DataService.get('idp');
  if(!idp) {
    self.idpUrl = 'register/idp-error';
  } else {
    self.idpUrl = idp.url;
  }
  self.use = 'one-time';
  $('#idp').attr('href', self.idpUrl);
  self.goClicked = function(use) {
    var loginHash = DataService.get('loginHash');

    console.log('start key generation');
    var rsa = forge.pki.rsa;
    var keypair = rsa.generateKeyPair({bits: 2048, e: 0x10001});
    console.log('end key generation');

    var privateKey = keypair.privateKey;
    var publicKey = keypair.publicKey;

    if(use == 'one-time') {
      sessionStorage.setItem('one-time', JSON.stringify(privateKey));
      // heads over to idp
      // idp signs the document request
      // stuff here is most likely wrong
        // and then signs it with the public key that I give them.
        // idp sends signed document request back to me
        // i decrypt it with my private key
      // hazy

      DataService.postToIdp();

      // send signed document back to credential consumer
    }
    if(use == 'permanent') {
      sessionStorage.setItem(
        'tempPrivate' + loginHash, JSON.stringify(privateKey));
      sessionStorage.setItem(
        'tempPublic' + loginHash, JSON.stringify(publicKey));

      // heads over to idp
      DataService.postToIdp();
      // idp signs the document request
      //  and then signs it with the public key that I give them?
      //  idp sends signed document request back to me
      //  i decrypt it with my private key
      //  send public key to dht WITH the idp's signature,
      //    so it is authorized to add the public key to DIDDocument
      //  send signed document back to credential consumer
      // idp does not sign the doc request
      //  send back invalid request or something
    }

    DataService.redirect(self.idpUrl);
  };
});

});
