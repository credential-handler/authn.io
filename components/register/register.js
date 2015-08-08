define([
  'angular',
  './register-controller',
  './register-directive'
], function(
  angular,
  registerController,
  registerDirective) {

'use strict';

var module = angular.module('authio.register2', ['ipCookie', 'bedrock.alert']);

module.controller(registerController);
module.directive(registerDirective);

});
