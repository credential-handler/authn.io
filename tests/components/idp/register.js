define([
  'angular',
  './credential-manager-controller',
  './register-controller',
  './register-directive'
], function(
  angular,
  credentialManagerController,
  registerController,
  registerDirective) {

'use strict';

var module = angular.module('authio.register', ['ipCookie', 'bedrock.alert']);

module.controller(credentialManagerController);
module.controller(registerController);
module.directive(registerDirective);

});
