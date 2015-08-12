define([
  'angular',
  './credentials-controller'
],
function(angular, credentialsController) {

'use strict';

var module = angular.module(
  'authio.credentials-store', ['bedrock.alert', 'ipCookie']);

module.controller(credentialsController);

return module.name;

});
