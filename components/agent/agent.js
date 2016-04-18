define([
  'angular',
  './agent-controller',
  './operation-service'
], function(angular, agentController, operationService) {

'use strict';

var module = angular.module(
  'authio.agent',
  ['authio.identity', 'authio.identityChooser', 'bedrock.alert']);

module.controller(agentController);
module.service(operationService);

/* @ngInject */
module.config(function($routeProvider) {
  $routeProvider
    .when('/agent', {
      title: 'Credential Agent',
      templateUrl: requirejs.toUrl('authio/agent/agent.html')
    });
});

});
