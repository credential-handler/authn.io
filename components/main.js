/*!
 * New BSD License (3-clause)
 * Copyright (c) 2015-2016, Digital Bazaar, Inc.
 * Copyright (c) 2015-2016, Accreditrust Technologies, LLC
 * All rights reserved.
 */
define([
  'angular',
  './add-identity-modal-component',
  './agent-component',
  './identity-chooser-component',
  './identity-service',
  './operation-service',
  './register-component',
  './splash-component',/*
  './idp-test/idp-test'*/
], function(angular) {

'use strict';

var module = angular.module('authio', [
  /* 'authio.idp-test',*/
  'bedrock.alert', 'bedrock.form', 'bedrock-navbar']);

Array.prototype.slice.call(arguments, 1).forEach(function(register) {
  register(module);
});

/* @ngInject */
module.config(function($routeProvider, routeResolverProvider) {
  routeResolverProvider.add('authio-resolver', resolve);
  /* @ngInject */
  function resolve($rootScope, $route) {
    var vars = $route.current.vars;

    if(!vars || !('ngClass' in vars)) {
      $rootScope.app.ngClass = {};
    } else {
      $rootScope.app.ngClass = vars.ngClass;
    }

    if(!vars || !('ngStyle' in vars)) {
      $rootScope.app.ngStyle = {};
    } else {
      $rootScope.app.ngStyle = vars.ngStyle;
    }
  }

  $routeProvider
    .when('/agent', {
      vars: {
        title: 'Credential Agent',
        navbar: false,
        ngClass: {
          rootContainer: {}
        },
        ngStyle: {
          body: {'background-color': 'transparent'}
        }
      },
      template: '<aio-agent></aio-agent>'
    })
    .when('/register', {
      vars: {
        title: 'Register',
        navbar: false,
        ngClass: {
          rootContainer: {}
        },
        ngStyle: {
          body: {'background-color': 'transparent'}
        }
      },
      template: '<aio-register></aio-register>'
    })
    .when('/test/credentials/idpquery', {
      vars: {
        title: 'Mock Credential Consumer Query'
      },
      templateUrl: requirejs.toUrl('authio/idp-test/idp-test.html')
    })
    .when('/test/credentials/composed-identity', {
      vars: {
        title: 'Mock Credential Consumer Query Results'
      },
      templateUrl: requirejs.toUrl('authio/idp-test/idp-test.html')
    })
    .when('/test/credentials/stored-credential', {
      vars: {
        title: 'Mock Credential Storage Results'
      },
      templateUrl: requirejs.toUrl('authio/idp-test/idp-test.html')
    });
});

});
