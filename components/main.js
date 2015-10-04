define([
  'angular',
  './request/request',
  './credentials/credentials',
  './credentials-store/credentials',
  './idp-test/idp-test',
  './register/register',
  'angular-local-storage'
], function(angular) {

'use strict';

var module = angular.module('authio.authorizationio', [
  'authio.login', 'authio.credentials',
  'authio.register2', 'authio.credentials-store', 'bedrock.alert',
  'authio.idp-test', 'LocalStorageModule']);

/* @ngInject */
module.config(function($routeProvider, localStorageServiceProvider) {
  $routeProvider.
    when('/', {
      title: 'Welcome',
      templateUrl: requirejs.toUrl('components/info/info.html')
    }).
    when('/register', {
      title: 'Register',
      templateUrl: requirejs.toUrl('components/register/register.html')
    }).
    when('/requests', {
      title: 'Credentials Request',
      templateUrl: requirejs.toUrl('components/request/request.html')
    }).
    when('/credentials', {
      title: 'Approve Credentials',
      templateUrl: requirejs.toUrl('components/credentials/credentials.html')
    }).
    when('/credentials/store', {
      title: 'Store Credentials',
      templateUrl: requirejs.toUrl(
        'components/credentials-store/credentials.html')
    }).
    when('/test/credentials/idpquery', {
      title: 'Mock Credential Consumer Query',
      templateUrl: requirejs.toUrl('components/idp-test/idp-test.html')
    }).
    when('/test/credentials/composed-identity', {
      title: 'Mock Credential Consumer Query Results',
      templateUrl: requirejs.toUrl('components/idp-test/idp-test.html')
    }).
    when('/test/credentials/stored-credential', {
      title: 'Mock Credential Storage Results',
      templateUrl: requirejs.toUrl('components/idp-test/idp-test.html')
    });

  localStorageServiceProvider
    .setPrefix('authio')
    .setStorageType('localStorage')
    .setNotify(false, false);
});

return module.name;

});
