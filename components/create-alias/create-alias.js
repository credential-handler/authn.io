define([
  'angular',
  'forge/forge'
], function(angular, forge) {

'use strict';

var module = angular.module('app.create-alias', ['bedrock.alert']);


module.controller('CreateAliasController', function(
  $http, $scope, config, DataService, brAlertService) {
  var self = this;

  self.createAlias = function(
    oldUsername, oldPassword, newUsername, newPassword, newPasswordDuplicate) {
    if(newPassword !== newPasswordDuplicate) {
      return brAlertService.add('error', 'New passwords do not match!');
    }

    var md = forge.md.sha256.create();
    md.update(oldUsername + oldPassword);
    var oldLoginHash = md.digest().toHex();

    console.log('oldLoginHash', oldLoginHash);

    // verify that entered account exists, by finding the associated DID
    Promise.resolve($http.get('/did',{params:{hashQuery:oldLoginHash}}))
      .then(function(response) {
        // got did, now make request to change hash
        var did = DataService.decryptDid(response.data, oldPassword);

        if(did != null) {
          var md = forge.md.sha256.create();
          md.update(newUsername + newPassword);
          var newLoginHash = md.digest().toHex();
          console.log("HERE!");
          var encryptedDid = DataService.encryptDid(did, newPassword);
          console.log('encryptedDid', encryptedDid);
          Promise.resolve($http.post(
            '/did/login-hash', {DID:encryptedDid, loginHash:newLoginHash}))
            .then(function(response) {
              var privateKey = localStorage.get(oldLoginHash);
              if(privateKey) {
                localStorage.setItem(newLoginHash, privateKey);
              } else {
                // there was never a private key here?
              }
              DataService.redirect('/');
            })
            .catch(function(err) {
              brAlertService.add(
                'error', 'Something went wrong, changes not applied');
            })
            .then(function() {
              $scope.$apply();
            });
        } else {
          console.log('failed here');
          brAlertService.add('error', 'Invalid Login Information');
        }
      })
      .catch(function(err) {
        console.log('failed here 2');
        brAlertService.add('error', 'Invalid Login Information');
      })
      .then(function() {
        $scope.$apply();
      });
  };
});


});
