define([
  'angular',
  'forge/forge'
], function(angular,forge) {

'use strict';

var module = angular.module('app.create-alias', ['bedrock.alert']);


module.controller('CreateAliasController', function($http, $scope, config, DataService, brAlertService) {
  var self = this;

  self.createAlias = function(oldUsername, oldPassword, newUsername, newPassword, newPasswordDuplicate){
    if(newPassword != newPasswordDuplicate){
      brAlertService.add('error', 'New passwords do not match!');
    }
    else {

    var md = forge.md.sha256.create();
    md.update(oldUsername + oldPassword);
    var oldLoginHash = md.digest().toHex();

    // verify that entered account exists, by finding the associated DID
    Promise.resolve($http.get('/DID',{params:{hashQuery:oldLoginHash}}))
      .then(function(response) {
        
        // got did, now make request to change hash
        var did = response.data;
        var md = forge.md.sha256.create();
        md.update(newUsername + newPassword);
        var newLoginHash = md.digest().toHex();
        Promise.resolve($http.post('/DID/loginHash', {DID:did, loginHash:newLoginHash}))
          .then(function(response) {
            var privateKey = localStorage.get(oldLoginHash);
            if(privateKey){
              localStorage.setItem(newLoginHash, privateKey);
              localStorage.removeItem(oldLoginHash);
            }
            else{
              // there was never a private key here?
            }
            DataService.redirect('/');
          })
          .catch(function(err) {
            brAlertService.add('error', 'Something went wrong, changes not applied');
          })
          .then(function() {
            $scope.$apply();
          });
      })
      .catch(function(err) {
        brAlertService.add('error', 'Invalid Login information');
      })
      .then(function() {
        $scope.$apply();
      });

    }

  };
});


});