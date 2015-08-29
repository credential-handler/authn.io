define([
  'angular',
  './idp-test-controller'
],
function(angular, idpTestController) {

'use strict';

var module = angular.module(
  'authio.idp-test', ['bedrock.alert', 'ipCookie']);

module.controller(idpTestController);

return module.name;

});
