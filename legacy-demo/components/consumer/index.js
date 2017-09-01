/*!
 * New BSD License (3-clause)
 * Copyright (c) 2015-2016, Digital Bazaar, Inc.
 * Copyright (c) 2015-2016, Accreditrust Technologies, LLC
 * All rights reserved.
 */
import angular from 'angular';
import ConsumerController from './consumer-controller.js';

var module = angular.module('authio.legacy.demo.consumer', ['bedrock.alert']);

module.controller('aiodConsumerController', ConsumerController);

/* @ngInject */
module.config(function($routeProvider) {
  $routeProvider
    .when('/consumer', {
      title: 'Credential Consumer',
      templateUrl: 'authio-legacy-demo/consumer/consumer.html'
    });
});
