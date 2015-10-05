define([
  'angular',
  './consumer/consumer',
  './idp/idp',
  './issuer/issuer'
], function(angular) {

'use strict';

var module = angular.module('authio-demo', [
  'authio-demo.consumer', 'authio-demo.idp', 'authio-demo.issuer']);

/* @ngInject */
module.config(function($routeProvider) {
  $routeProvider
    .when('/', {
      title: 'Welcome',
      templateUrl: requirejs.toUrl('authio-demo/welcome.html')
    });
});

return module.name;

});
