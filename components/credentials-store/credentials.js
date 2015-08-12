// FIXME: This is an unused route template that can be reused or eliminated.

define([
  'angular',
  './credentials-store-controller'
],
function(angular, credentialsStoreController) {

'use strict';

var module = angular.module(
  'authio.credentials', ['bedrock.alert', 'ipCookie']);

module.controller(credentialsStoreController);

return module.name;

});
