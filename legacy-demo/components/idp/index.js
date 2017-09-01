/*!
 * New BSD License (3-clause)
 * Copyright (c) 2015-2016, Digital Bazaar, Inc.
 * Copyright (c) 2015-2016, Accreditrust Technologies, LLC
 * All rights reserved.
 */
import angular from 'angular';
import CredentialManagerController from './credential-manager-controller.js';
import RegisterController from './register-controller.js';

var module = angular.module('authio.legacy.demo.idp', [
  'ipCookie', 'bedrock.alert', 'bedrock.card-displayer', 'bedrock.credential',
  'bedrock.identity-composer', 'bedrock.resolver'
]);

module.controller(
  'aiodCredentialManagerController', CredentialManagerController);
module.controller('aiodRegisterController', RegisterController);

/* @ngInject */
module.config(function($routeProvider, routeResolverProvider) {
  routeResolverProvider.add('authio.legacy.demo-resolver', resolve);

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
    .when('/idp/register', {
      title: 'Identity Provider',
      templateUrl: 'authio-legacy-demo/idp/register.html'
    })
    .when('/idp/credential-manager', {
      vars: {
        title: 'Credential Manager',
        navbar: false,
        footer: {
          show: false
        },
        ngClass: {
          rootContainer: {}
        },
        ngStyle: {
          body: {
            'background-color': 'transparent'
          },
          rootContainer: {
            'background-color': 'transparent'
          }
        }
      },
      templateUrl: 'authio-legacy-demo/idp/credential-manager.html'
    });
});

/* @ngInject */
module.run(function(brCredentialService) {
  // generic card types
  var cardTypes = [
    "urn:bedrock:test:PassportCredential"
  ];
  cardTypes.forEach(function(cardType) {
    var accept = {};
    accept[cardType] = {};
    brCredentialService.registerDisplayer({
      id: 'urn:bedrock:card:type:' + cardType,
      accept: accept,
      directive: 'br-credential-card-displayer'
    });
  });
});
