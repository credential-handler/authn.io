define([
  'angular',
  'underscore',
  'did-io',
  './idp/register'
], function(
  angular, _, didio
) {

'use strict';

var module = angular.module('app.idpconsumer', [
  'app.login', 'app.register', 'bedrock.alert']);

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
    .when('/create-identity', {
      title: 'Create Identity',
      templateUrl: requirejs.toUrl('idp-components/idp/register.html')
    })
;
});

return module.name;
});
