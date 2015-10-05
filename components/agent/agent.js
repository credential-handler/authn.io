define([
  'angular',
  /*'angular-local-storage',*/
  './agent-controller',
  './proxy-service'
], function(angular, agentController, proxyService) {

'use strict';

var module = angular.module(
  'authio.agent',
  ['authio.identity', 'authio.identityChooser', 'bedrock.alert'/*,
  'LocalStorageModule'*/]);

module.controller(agentController);
module.service(proxyService);

/* @ngInject */
module.config(function($routeProvider/*, localStorageServiceProvider*/) {
  /* @ngInject */
  module.config(function($routeProvider) {
    $routeProvider
      .when('/agent', {
        title: 'Credential Agent',
        templateUrl: requirejs.toUrl('authio/agent/agent.html')
      });
  });
/*
  localStorageServiceProvider
    .setPrefix('authio')
    .setStorageType('localStorage')
    .setNotify(false, false);*/
});

});
