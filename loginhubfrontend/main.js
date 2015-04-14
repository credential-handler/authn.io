define([
  'angular', 'underscore','forge/forge'
], function(
  angular,_,forge
) {

'use strict';

var module = angular.module('app.loginhubfrontend',[]);

/* @ngInject */
module.config(function($routeProvider) {
  $routeProvider.when('/', {
    title: 'Main',
   templateUrl: requirejs.toUrl('loginhubfrontend/main.html')
  });
});


module.controller('FormController', function($scope, $http) {
  var self = this;
  self.name = '';



 self.login = function(username,password) {
   //TODO: fix hash to use delimeters or any other improvements
   var md = forge.md.sha256.create();
    md.update(username + password);
   Promise.resolve($http.post('/DIDQuery/' ,{hashQuery: md.digest().toHex()}))
      .then(function(response) {
        console.log(response);
      })
      .catch(function(err) {
        console.log("There was an error")
      })
      .then(function() {
        $scope.$apply();
      });
  };
});








return module.name;
});
