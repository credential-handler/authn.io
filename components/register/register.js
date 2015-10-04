define([
  'angular',
  './register-did-controller',
  './matches-input-directive'
], function(
  angular,
  registerDidController,
  matchesInputDirective) {

'use strict';

var module = angular.module('authio.register', ['ipCookie', 'bedrock.alert']);

module.controller(registerDidController);
module.directive(matchesInputDirective);

});
