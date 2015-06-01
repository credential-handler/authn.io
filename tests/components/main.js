define([
  'angular',
  'underscore',
  'did-io',
  './idp/register'
], function(
  angular, _, didio
) {

'use strict';

var module = angular.module('authio.idpconsumer', [
  'authio.login', 'authio.register', 'bedrock.alert']);

/* @ngInject */
module.config(function($routeProvider) {
  $routeProvider.
    when('/idp', {
      title: 'Identity Provider',
      templateUrl: requirejs.toUrl('idp-components/idp/index.html')
    })
    .when('/idp/credentials', {
      title: 'Credential Composer',
      templateUrl: requirejs.toUrl('idp-components/idp/credentials.html')
    })
    .when('/idp/identities', {
      title: 'Register Identity',
      templateUrl: requirejs.toUrl('idp-components/idp/register.html')
    })
    .when('/consumer/requestor', {
      title: 'Credential Consumer',
      templateUrl: requirejs.toUrl('idp-components/consumer/cc.html')
    }).
    when('/consumer/issuer', {
      title: 'Credential Issuer',
      templateUrl: requirejs.toUrl('idp-components/consumer/cc.html')
    });
});

return module.name;
});
