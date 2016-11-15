/*!
 * New BSD License (3-clause)
 * Copyright (c) 2015-2016, Digital Bazaar, Inc.
 * Copyright (c) 2015-2016, Accreditrust Technologies, LLC
 * All rights reserved.
 */
define(['angular', './issuer-controller'], function(angular, issuerController) {

'use strict';

var module = angular.module('authio-demo.issuer', ['bedrock.alert']);

module.controller(issuerController);

/* @ngInject */
module.config(function($routeProvider) {
  $routeProvider
    .when('/issuer', {
      title: 'Issuer',
      templateUrl: requirejs.toUrl('authio-demo/issuer/issuer.html')
    });
});

});
