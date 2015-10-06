define([
  'angular',
  './consumer-controller'
], function(angular, consumerController) {

'use strict';

var module = angular.module('authio-demo.consumer', ['bedrock.alert']);

module.controller(consumerController);

/* @ngInject */
module.config(function($routeProvider) {
  $routeProvider
    .when('/consumer', {
      title: 'Credential Consumer',
      templateUrl: requirejs.toUrl('authio-demo/consumer/consumer.html')
    });
});

return module.name;

});
