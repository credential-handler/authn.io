define([
  'angular',
  './identity-service'
], function(angular, identityService) {

'use strict';

var module = angular.module('authio.identity', []);

module.service(identityService);

});
