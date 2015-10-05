define([
  'angular',
  './register-did-controller',
  './matches-input-directive'
], function(
  angular,
  registerDidController,
  matchesInputDirective) {

'use strict';

var module = angular.module(
  'authio.registerDid', ['authio.identity', 'bedrock.alert']);

module.controller(registerDidController);
module.directive(matchesInputDirective);

/* @ngInject */
module.config(function($routeProvider) {
  $routeProvider
    .when('/register', {
      title: 'Register',
      templateUrl: requirejs.toUrl('authio/register-did/register-did.html')
    });
});

return module.name;

});
