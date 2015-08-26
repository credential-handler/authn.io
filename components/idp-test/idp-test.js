define([
  'angular',
  './idp-test-controller'
],
function(angular, idpTestController) {

'use strict';

var module = angular.module(
  'authio.credentials-store', ['bedrock.alert', 'ipCookie']);

module.controller(idpTestController);

return module.name;

});
