define([
  'angular',
  './proxy-controller',
  './proxy-service'
], function(angular, proxyController, proxyService) {

'use strict';

var module = angular.module(
  'authio.proxy',
  ['authio.identity', 'authio.identityChooser', 'bedrock.alert']);

module.controller(proxyController);
module.service(proxyService);

});
