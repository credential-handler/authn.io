/*!
 * New BSD License (3-clause)
 * Copyright (c) 2017-2018, Digital Bazaar, Inc.
 * All rights reserved.
 */
import angular from 'angular';
import * as bedrock from 'bedrock-angular';
import HandlerWindowHeaderComponent from './handler-window-header-component.js';
import HomeComponent from './home-component.js';
import MediatorComponent from './mediator-component.js';

'use strict';

const deps = ['web-request-mediator'];

const module = angular.module('authio', deps);
module.component('aioHandlerWindowHeader', HandlerWindowHeaderComponent);
module.component('aioHome', HomeComponent);
module.component('aioMediator', MediatorComponent);

bedrock.setRootModule(module);

/* @ngInject */
module.config($routeProvider => {
  $routeProvider
    .when('/', {
      title: 'authorization.io',
      template: '<aio-home></aio-home>'
    })
    .when('/mediator', {
      title: 'Credential Mediator',
      template: '<aio-mediator></aio-mediator>'
    });
});
