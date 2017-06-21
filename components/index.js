/*!
 * New BSD License (3-clause)
 * Copyright (c) 2015-2016, Digital Bazaar, Inc.
 * Copyright (c) 2015-2016, Accreditrust Technologies, LLC
 * All rights reserved.
 */

import angular from 'angular';
import * as bedrock from 'bedrock-angular';
import AgentComponent from './agent-component.js';
import FindIdentityModalComponent from './find-identity-modal-component.js';
import IdentityChooserComponent from './identity-chooser-component.js';
import IdentityService from './identity-service.js';
import OperationService from './operation-service.js';
import PermissionService from './permission-service.js';
import RegisterComponent from './register-component.js';
import UtilService from './util-service.js';

var module = angular.module('authio', [
  'authio-demo', 'bedrock.alert', 'bedrock.filters', 'bedrock.form',
  'bedrock.modal', 'bedrock.navbar', 'bedrock.resolver', 'ngError'
]);

bedrock.setRootModule(module);

module.component('aioAgent', AgentComponent);
module.component('aioFindIdentityModal', FindIdentityModalComponent);
module.component('aioIdentityChooser', IdentityChooserComponent);
module.component('aioRegister', RegisterComponent);
module.service('aioIdentityService', IdentityService);
module.service('aioOperationService', OperationService);
module.service('aioPermissionService', PermissionService);
module.service('aioUtilService', UtilService);

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
      templateUrl: 'authio/idp-test/idp-test.html'
    })
    .when('/test/credentials/composed-identity', {
      vars: {
        title: 'Mock Credential Consumer Query Results'
      },
      templateUrl: 'authio/idp-test/idp-test.html'
    })
    .when('/test/credentials/stored-credential', {
      vars: {
        title: 'Mock Credential Storage Results'
      },
      templateUrl: 'authio/idp-test/idp-test.html'
    });
});
