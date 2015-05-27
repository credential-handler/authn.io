define([
  'angular',
  'forge/forge',
  'did-io',
  'node-uuid'
], function(angular, forge, didiojs, uuid) {

'use strict';

var module = angular.module('app.login', ['bedrock.alert', 'ipCookie']);
var didio = didiojs({inject: {
  forge: forge,
  uuid: uuid
}});

module.controller('LoginController', function(
  $scope, $http, $location, ipCookie, $window, config, DataService,
  brAlertService) {
  var self = this;
  var pki = forge.pki;

  self.login = function(username, password) {
    var hash = didio.generateHash(username, password);
    var encryptedPem = localStorage.getItem(hash);
    var privateKey = null;

    // decrypt the encrypted key, if it exists
    if(encryptedPem) {
      privateKey =
        pki.decryptRsaPrivateKey(encryptedPem, username + password);

      // TODO: Store decrypted private key in session storage?
      console.log("decrypted private key from localstorage:", privateKey);
    }

    // fetch the username + passphrase mapping
    var did = null;
    Promise.resolve($http.get('/mappings/' + hash))
      .then(function(response) {
        console.log('response from GET /mappings/:hash', response);

        // the mapping fetch succeeded
        if(response.data && response.data.did) {
          did = response.data.did;
        } else {
          throw new Error('DID lookup failed');
        }
        console.log('got did:', did);

        // TODO: Re-direct to request-with-new-device path
        if(!privateKey) {
          console.log('TODO: Implement request credential with '+
            'new device flow');
        }

        // get the DID document
        return Promise.resolve($http.get('/dids/' + did));
      }).then(function(response) {
        // fetched the person's DID document
        console.log("got did document", response);
        var didDocument = response.data;
        return Promise.resolve($http.get('/dids/' + didDocument.idp));
      }).then(function(response) {
        console.log("got IDP did document", response);
        // fetched the person's IDP DID document
        var idpDidDocument = response.data;
        // extract the IDP DID credential request URL
        var cookie = {
          credentialRequestUrl: idpDidDocument.credentialsRequestUrl,
          idp: idpDidDocument.id,
          did: did
        };
        console.log('cookie', cookie);
        ipCookie('session', cookie);

        return cookie;
      }).then(function(cookie) {
        var id = Date.now();
        console.log('config.data', config.data);
        var authioCallback =
          'https://authorization.dev:33443/credentials?id=' + id
        var rpCredentialCallback = $location.search().credentialCallback;
        sessionStorage.setItem(id, rpCredentialCallback);

        navigator.credentials.request(config.data.credentialRequest, {
          requestUrl: cookie.credentialRequestUrl,
          credentialCallback: authioCallback
        });
      }).catch(function(err) {
        brAlertService.add('error', 'Unable to log in.');
        console.log(err);
      }).then(function() {
        $scope.$apply();
      });
  };
});

});
