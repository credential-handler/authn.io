define([
  'angular',
  'forge/forge'
], function(angular,forge) {

'use strict';

var module = angular.module('app.register', ['bedrock.alert']);


module.controller('RegisterController', function($scope, $http, $window, DataService, brAlertService) {
  var self = this;
  self.passwordConfirmation = '';
  self.password = '';
  self.username = '';
    console.log('DataService.get(idp)', DataService.get('idpInfo'));

  if(!DataService.get('idpInfo')){
    DataService.redirect('/register/idp-error');
  }

  self.register = function() {
    // TODO: Add more validation checks
    if(self.password != self.passwordConfirmation) {
      brAlertService.add('error', 
            'Passwords don\'t match'); 
    }
    else if(self.username.length == 0) {
      brAlertService.add('error', 
            'Enter a username'); 
    }
    else {
      var username = self.username;
      var password = self.password;
      var md = forge.md.sha256.create();
      md.update(username + password);
      var hash = md.digest().toHex();
      var idpInfo = DataService.get('idpInfo');
      var rsa = forge.pki.rsa;

      console.log('start key generation ');

      // TODO: Put spinner while key is generating
      var keypair = rsa.generateKeyPair({bits: 2048, e: 0x10001});
      
      //places private key in browsers local storage
      localStorage.setItem(hash, JSON.stringify(keypair.privateKey));
      // to retrieve the private key, do the following
      // var privateKey = localStorage.getItem(hash)

      var userDid = 'did:' + DataService.uuid();

//---------------------------------------------------------------
// PKCS5
// AES-GCM 
// password encrypted blob / salt / encryption method / number of iterations.

//password-based key derivation 2
//pbkdf2

// iterations, salt, password blob/key

//encryption
// IV, authentication tag


      var pwKeyHashMethod = 'PKCS5';
      var encryptionMethod = 'AES-GCM';

      var salt = forge.random.getBytesSync(128);

      // where does this come into play with this encryption?
      var numIterations = 5;

      // i don't get this thing..
      var key = forge.pkcs5.pbkdf2(password, salt, numIterations, 16)
      
      var iv = forge.random.getBytesSync(16);
      var cipher = forge.cipher.createCipher('AES-GCM', key);

      cipher.start({
        iv: iv, // should be a 12-byte binary-encoded string or byte buffer
        tagLength: 128 // optional, defaults to 128 bits
      });
      cipher.update(forge.util.createBuffer(userDid));
      cipher.finish();
      var encrypted = forge.util.encode64(cipher.output.getBytes());
      var tag = forge.util.encode64(cipher.mode.tag.getBytes());
      var iv64 = forge.util.encode64(iv);

      console.log('Actual blob', encrypted);

      console.log('THE KEY', key);



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

      var encryptedDid = JSON.stringify(edid);

      console.log('Final encrypted did', encryptedDid);
//---------------------------------------------------------------



      console.log('end key generation');

      var DidDocument = {
        publicKeys: [keypair.publicKey],
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
      }

      //Stores the DID
      Promise.resolve($http.post('/storeDID/', data))
        .then(function(response) {
          console.log(response.data);
          if(response.data == "Failed to create user"){
            brAlertService.add('error', 
            'Could not create account. Use a different login/pw.'); 
          }
          else{
            console.log("Success");
            console.log("idpInfo", DataService.get('idpInfo'));
            DataService.redirect('/');
            $scope.$apply();
          }
        });
    }
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

// password encrypted blob / salt / encryption method / number of iterations /.

    */
  }
});

});