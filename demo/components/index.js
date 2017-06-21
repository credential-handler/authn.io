/*!
 * New BSD License (3-clause)
 * Copyright (c) 2015-2016, Digital Bazaar, Inc.
 * Copyright (c) 2015-2016, Accreditrust Technologies, LLC
 * All rights reserved.
 */
import angular from 'angular';
import './consumer/index.js';
import './idp/index.js';
import './issuer/index.js';

var module = angular.module('authio-demo', [
  'authio-demo.consumer', 'authio-demo.idp', 'authio-demo.issuer']);

/* @ngInject */
module.config(function($routeProvider) {
  $routeProvider
    .when('/', {
      title: 'Welcome',
      templateUrl: 'authio-demo/welcome.html'
    });
});
