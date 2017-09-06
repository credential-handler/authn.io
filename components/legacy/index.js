/*!
 * New BSD License (3-clause)
 * Copyright (c) 2015-2016, Digital Bazaar, Inc.
 * Copyright (c) 2015-2016, Accreditrust Technologies, LLC
 * All rights reserved.
 */
import angular from 'angular';
import AgentComponent from './agent-component.js';
import FindIdentityModalComponent from './find-identity-modal-component.js';
import IdentityChooserComponent from './identity-chooser-component.js';
import IdentityService from './identity-service.js';
import OperationService from './operation-service.js';
import PermissionService from './permission-service.js';
import RegisterComponent from './register-component.js';
import UtilService from './util-service.js';

const module = angular.module('authio.legacy', ['ngError', 'stackables']);

module.component('aioAgent', AgentComponent);
module.component('aioFindIdentityModal', FindIdentityModalComponent);
module.component('aioIdentityChooser', IdentityChooserComponent);
module.component('aioRegister', RegisterComponent);
module.service('aioIdentityService', IdentityService);
module.service('aioOperationService', OperationService);
module.service('aioPermissionService', PermissionService);
module.service('aioUtilService', UtilService);
module.filter('isEmpty', () => {
  return value => {
    if(angular.isArray(value) || angular.isString(value)) {
      return value.length === 0;
    }
    if(angular.isObject(value)) {
      return Object.keys(value).length === 0;
    }
    throw new Error('Unknown value for isEmpty filter.');
  };
});

/* @ngInject */
module.config($routeProvider => {
  $routeProvider
    .when('/agent', {
      vars: {
        title: 'Credential Agent'
      },
      template: '<aio-agent></aio-agent>'
    })
    .when('/register', {
      vars: {
        title: 'Register'
      },
      template: '<aio-register></aio-register>'
    });
});
