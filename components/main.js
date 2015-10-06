define([
  'angular',
  './agent/agent',
  './identity/identity',
  './identity-chooser/identity-chooser',
  './idp-test/idp-test',
  './register-did/register-did'
], function(angular) {

'use strict';

var module = angular.module('authio', [
  'authio.agent', 'authio.identity', 'authio.identityChooser',
  'authio.registerDid', 'authio.idp-test']);

// TODO: use this instead of the above line
// var module = angular.module(
//   'authio', Array.prototype.slice.call(arguments, 1));

/* @ngInject */
module.config(function($routeProvider) {
  $routeProvider
    .when('/test/credentials/idpquery', {
      title: 'Mock Credential Consumer Query',
      templateUrl: requirejs.toUrl('components/idp-test/idp-test.html')
    })
    .when('/test/credentials/composed-identity', {
      title: 'Mock Credential Consumer Query Results',
      templateUrl: requirejs.toUrl('components/idp-test/idp-test.html')
    })
    .when('/test/credentials/stored-credential', {
      title: 'Mock Credential Storage Results',
      templateUrl: requirejs.toUrl('components/idp-test/idp-test.html')
    });
});

return module.name;

});
