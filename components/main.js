define([
  'angular', 'underscore','forge/forge'
], function(
  angular,_,forge
) {

'use strict';

var module = angular.module('app.loginhub',[]);

/* @ngInject */
module.config(function($routeProvider) {
  $routeProvider.
    when('/', {
      title: 'Main',
      templateUrl: requirejs.toUrl('components/main.html')
    }).
    when('/createDID', {
      title: 'Login',
      templateUrl: requirejs.toUrl('components/main.html')
    }).
    when('/register', {
      title: 'Register',
      templateUrl: requirejs.toUrl('components/register.html')
    });
});

module.factory('DataService', function() {
  var savedData = {}
  function set(data) {
    savedData = data;
  }
  function get() {
    return savedData;
  }
  return {
    set: set,
    get: get
  }
});

module.controller('RegisterController', function($scope, $http, DataService) {
  var self = this;
  console.log(DataService.get());
  self.register = function() {
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
    */
  }
});

module.controller('FormController', function($scope, $http, config, DataService) {
  var self = this;
  self.name = '';

  console.log('config', config);
  DataService.set(config.data.idpInfo);

  self.login = function(username,password) {
    //TODO: fix hash to use delimeters or any other improvements
    var md = forge.md.sha256.create();
    md.update(username + password);
    Promise.resolve($http.post('/DIDQuery/' ,{hashQuery: md.digest().toHex()}))
      .then(function(response) {
        console.log(response);
      })
      .catch(function(err) {
        console.log('There was an error')
      })
      .then(function() {
        $scope.$apply();
      });
  };
});


return module.name;
});
