define([
  'angular',
  './request-controller'
], function(angular, requestController) {

'use strict';

var module = angular.module('authio.login', ['bedrock.alert', 'ipCookie']);

module.controller(requestController);

});
