/*!
 * New BSD License (3-clause)
 * Copyright (c) 2015-2016, Digital Bazaar, Inc.
 * Copyright (c) 2015-2016, Accreditrust Technologies, LLC
 * All rights reserved.
 */
define([
  'angular',
  './credential-manager-controller',
  './register-controller'
], function(
  angular,
  credentialManagerController,
  registerController) {

'use strict';

var module = angular.module('authio-demo.idp', ['ipCookie', 'bedrock.alert']);

module.controller(credentialManagerController);
module.controller(registerController);

/* @ngInject */
module.config(function($routeProvider) {
  $routeProvider
    .when('/idp/register', {
      title: 'Identity Provider',
      templateUrl: requirejs.toUrl('authio-demo/idp/register.html')
    })
    .when('/idp/credential-manager', {
      title: 'Credential Manager',
      templateUrl: requirejs.toUrl('authio-demo/idp/credential-manager.html')
    });
});

return module.name;

});
