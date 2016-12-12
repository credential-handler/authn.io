/*!
 * New BSD License (3-clause)
 * Copyright (c) 2015-2016, Digital Bazaar, Inc.
 * Copyright (c) 2015-2016, Accreditrust Technologies, LLC
 * All rights reserved.
 */
define([
  'angular',
  './agent-component',
  './identity-service',
  './operation-service',
  './register-component',
  './splash-component',
  './identity-chooser/identity-chooser',
  './idp-test/idp-test'
], function(angular) {

'use strict';

var module = angular.module('authio', [
  'authio.identityChooser', 'authio.idp-test',
  'bedrock.alert', 'bedrock.form', 'bedrock-navbar']);

Array.prototype.slice.call(arguments, 1, 6).forEach(function(register) {
  register(module);
});

/* @ngInject */
module.config(function($routeProvider) {
  $routeProvider
    .when('/agent', {
      vars: {
        title: 'Credential Agent',
        navbar: false
      },
      template: '<aio-agent></aio-agent>'
    })
    .when('/register', {
      vars: {
        title: 'Register',
        navbar: false
      },
      template: '<aio-register></aio-register>'
    })
    .when('/test/credentials/idpquery', {
      vars: {
        title: 'Mock Credential Consumer Query'
      },
      templateUrl: requirejs.toUrl('components/idp-test/idp-test.html')
    })
    .when('/test/credentials/composed-identity', {
      vars: {
        title: 'Mock Credential Consumer Query Results',
      },
      templateUrl: requirejs.toUrl('components/idp-test/idp-test.html')
    })
    .when('/test/credentials/stored-credential', {
      vars: {
        title: 'Mock Credential Storage Results'
      },
      templateUrl: requirejs.toUrl('components/idp-test/idp-test.html')
    });
});

});
