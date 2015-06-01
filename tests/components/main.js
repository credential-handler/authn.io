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
      templateUrl: requirejs.toUrl('authiodev-components/idp/index.html')
    })
    .when('/idp/credentials', {
      title: 'Credential Composer',
      templateUrl: requirejs.toUrl('authiodev-components/idp/credentials.html')
    })
    .when('/idp/identities', {
      title: 'Register Identity',
      templateUrl: requirejs.toUrl('authiodev-components/idp/register.html')
    })
    .when('/consumer/requestor', {
      title: 'Credential Requestor',
      templateUrl: requirejs.toUrl('authiodev-components/consumer/requestor.html')
    }).
    when('/consumer/credentials', {
      title: 'Credential Consumer',
      templateUrl: requirejs.toUrl('authiodev-components/consumer/credentials.html')
    })
    .when('/consumer/issuer', {
      title: 'Credential Issuer',
      templateUrl: requirejs.toUrl('authiodev-components/consumer/issuer.html')
    });
});

return module.name;
});
