define([
  'angular',
  './credential-manager-controller',
  './register-controller'
], function(
  angular,
  credentialManagerController,
  registerController) {

'use strict';

var module = angular.module('authio-demo.idp', ['ipCookie', 'bedrock.alert']);

module.controller(credentialManagerController);
module.controller(registerController);

/* @ngInject */
module.config(function($routeProvider) {
  $routeProvider.
    when('/idp/register', {
      title: 'Identity Provider',
      templateUrl: requirejs.toUrl('authio-demo/idp/register.html')
    })
    .when('/idp/credentials', {
      title: 'Credential Composer',
      templateUrl: requirejs.toUrl('authio-demo/idp/credentials.html')
    });
});

return module.name;

});
