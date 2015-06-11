define([
  'angular',
  'forge/forge',
  'did-io',
  'node-uuid'
], function(angular, forge, didiojs, uuid) {

'use strict';

var module = angular.module('authio.login', ['bedrock.alert', 'ipCookie']);
var pki = forge.pki;
var didio = didiojs({inject: {
  forge: forge,
  uuid: uuid
}});

module.controller('RequestController', function(
  $scope, $http, $location, ipCookie, config, brAlertService) {
  var self = this;
  self.loginRequired = false;

  /**
   * Attempt to redirect the browser if a session exists.
   */
  self.redirect = function() {
    try {
      var session = ipCookie('session');
      // refresh session
      ipCookie('session', session, {
        expires: 120,
        expirationUnit: 'minutes'
      });
      _navigateToIdp(session);
    } catch(e) {
      self.loginRequired = true;
    }
  };

  /**
   * Perform a login and redirect the browser if the login is
   * successful.
   *
   * @param username the username to use when logging in.
   * @param password the password to use when logging in.
   */
  self.login = function(username, password) {
    var hash = didio.generateHash(username, password);
    var encryptedPem = localStorage.getItem(hash);
    var privateKey = null;

    // decrypt the encrypted key, if it exists
    if(encryptedPem) {
      privateKey =
        pki.decryptRsaPrivateKey(encryptedPem, username + password);
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
          console.log('TODO: Implement request credential with ' +
            'new device flow');
        }

        // get the DID document
        return Promise.resolve($http.get('/dids/' + did));
      }).then(function(response) {
        // fetched the person's DID document
        var didDocument = response.data;
        return Promise.resolve($http.get('/dids/' + didDocument.idp));
      }).then(function(response) {
        // fetched the person's IDP DID document
        var idpDidDocument = response.data;
        // extract the IDP DID credential request URL
        var cookie = {
          did: did,
          privateKeyPem: pki.privateKeyToPem(privateKey),
          credentialRequestUrl: idpDidDocument.credentialsRequestUrl,
          storageRequestUrl: idpDidDocument.storageRequestUrl
        };
        ipCookie('session', cookie, {
          expires: 120,
          expirationUnit: 'minutes'
        });

        return cookie;
      }).then(_navigateToIdp)
      .catch(function(err) {
        brAlertService.add('error', 'Unable to log in.');
        console.log(err);
      }).then(function() {
        $scope.$apply();
      });
  };

  var _navigateToIdp = function(session) {
    var id = Date.now();
    var authioCallback =
      config.data.baseUri + '/credentials?id=' + id;
    var credentialCallback = $location.search().credentialCallback;
    var storageCallback = $location.search().storageCallback;

    if(credentialCallback) {
      sessionStorage.setItem(id, credentialCallback);
      navigator.credentials.request(config.data.credentialRequest, {
        requestUrl: session.credentialRequestUrl,
        credentialCallback: authioCallback
      });
    } else if(storageCallback) {
      sessionStorage.setItem(id, storageCallback);
      navigator.credentials.store(config.data.storageRequest, {
        requestUrl: session.storageRequestUrl,
        storageCallback: authioCallback
      });
    }
  };
});

});
