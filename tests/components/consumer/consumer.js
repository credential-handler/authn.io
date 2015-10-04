define(['angular'], function(angular) {

'use strict';

var module = angular.module('authio-demo.consumer', []);

/* @ngInject */
module.config(function($routeProvider) {
  $routeProvider
    .when('/consumer/requestor', {
      title: 'Credential Requestor',
      templateUrl: requirejs.toUrl('authio-demo/consumer/requestor.html')
    }).
    when('/consumer/credentials', {
      title: 'Credential Consumer',
      templateUrl: requirejs.toUrl('authio-demo/consumer/credentials.html')
    });
});

return module.name;

});
