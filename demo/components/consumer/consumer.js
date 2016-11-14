/*!
 * New BSD License (3-clause)
 * Copyright (c) 2015-2016, Digital Bazaar, Inc.
 * Copyright (c) 2015-2016, Accreditrust Technologies, LLC
 * All rights reserved.
 */
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
