define([
  'angular',
  'forge/forge',
  'jquery'
], function(angular, forge) {

'use strict';

var module = angular.module('app.new-device', []);

module.controller('NewDeviceController', function($scope, DataService) {
  var self = this;
  var idpInfo = DataService.get('idpInfo');
  if(!idpInfo) {
    self.idpUrl = 'register/idp-error';
  }
  else{
    self.idpUrl = idpInfo.url;
  }
  self.use = 'one-time';
  $('#idpInfo').attr('href', self.idpUrl);
  self.goClicked = function(use){
    var loginHash = DataService.get('loginHash');

    console.log('start key generation');
    var rsa = forge.pki.rsa;
    var keypair = rsa.generateKeyPair({bits: 2048, e: 0x10001});
    console.log('end key generation');

    var privateKey = keypair.privateKey;
    var publicKey = keypair.publicKey;

    if(use == 'one-time'){
      sessionStorage.setItem('one-time', JSON.stringify(privateKey));
      // heads over to idp
      // idp signs the document request
      // and then signs it with the public key that I give them.
      // idp sends signed document request back to me
      // i decrypt it with my private key

      // hazy

      // send signed document back to credential consumer
    }
    else if(use == 'permanent'){
      sessionStorage.setItem('tempPrivate' + loginHash, JSON.stringify(privateKey));
      sessionStorage.setItem('tempPublic' + loginHash, JSON.stringify(publicKey));
      var data = {};
      data.publicKey = publicKey;
      data.callback = '/';
      
      // heads over to idp
      // idp signs the document request
      //  and then signs it with the public key that I give them?
      //  idp sends signed document request back to me
      //  i decrypt it with my private key
      //  send public key to dht WITH the idp's signature, so it is authorized to add the public key to DIDDocument
      //  send signed document back to credential consumer
      // idp does not sign the doc request
      //  send back invalid request or something
    }

    DataService.redirect(self.idpUrl);
  }
});


});