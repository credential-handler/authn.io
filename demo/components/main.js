/*!
 * New BSD License (3-clause)
 * Copyright (c) 2015-2016, Digital Bazaar, Inc.
 * Copyright (c) 2015-2016, Accreditrust Technologies, LLC
 * All rights reserved.
 */
define([
  'angular',
  './consumer/consumer',
  './idp/idp',
  './issuer/issuer'
], function(angular) {

'use strict';

var module = angular.module('authio-demo', [
  'authio-demo.consumer', 'authio-demo.idp', 'authio-demo.issuer']);

/* @ngInject */
module.config(function($routeProvider) {
  $routeProvider
    .when('/', {
      title: 'Welcome',
      templateUrl: requirejs.toUrl('authio-demo/welcome.html')
    });
});

return module.name;

});
