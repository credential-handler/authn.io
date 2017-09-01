/*!
 * New BSD License (3-clause)
 * Copyright (c) 2015-2016, Digital Bazaar, Inc.
 * Copyright (c) 2015-2016, Accreditrust Technologies, LLC
 * All rights reserved.
 */
import angular from 'angular';
import IssuerController from './issuer-controller.js';

var module = angular.module('authio.legacy.demo.issuer', ['bedrock.alert']);

module.controller('aiodIssuerController', IssuerController);

/* @ngInject */
module.config(function($routeProvider) {
  $routeProvider
    .when('/issuer', {
      title: 'Issuer',
      templateUrl: 'authio-legacy-demo/issuer/issuer.html'
    });
});
