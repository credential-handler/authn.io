define([
  'angular',
  'forge/forge'
], function(angular, forge) {

'use strict';

var module = angular.module('app.register', ['bedrock.alert']);


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
    var username = self.username;
    var password = self.password;
    var md = forge.md.sha256.create();
    md.update(username + password);
    var hash = md.digest().toHex();
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

    var userDid = 'did:' + DataService.uuid();

    var encryptedDid = DataService.encryptDid(userDid, password);
    console.log('Final encrypted did', encryptedDid);

    console.log('end key generation');

    var DidDocument = {
      publicKeys: [keypair.publicKey]
    };

    // TODO: Make this check better
    if(idpInfo != undefined) {
      DidDocument.idp = idpInfo;
    }

    var data = {
      DIDDocument: DidDocument,
      EDID: encryptedDid,
      DID: userDid,
      loginHash: hash
    };

    //Stores the DID
    Promise.resolve($http.post('/dids/', data))
      .then(function(response) {
        console.log(response.data);
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
