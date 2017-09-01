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

var module = angular.module('authio.legacy.demo', [
  'authio.legacy.demo.consumer', 'authio.legacy.demo.idp',
  'authio.legacy.demo.issuer',
  'bedrock.footer', 'bedrock.header', 'bedrock.navbar']);

/* @ngInject */
module.config(function($routeProvider) {
  $routeProvider
    .when('/legacy', {
      title: 'Welcome',
      templateUrl: 'authio-legacy-demo/welcome.html'
    });
});
