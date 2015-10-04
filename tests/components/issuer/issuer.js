define(['angular', './issuer-controller'], function(angular, issuerController) {

'use strict';

var module = angular.module('authio-demo.issuer', ['bedrock.alert']);

module.controller(issuerController);

/* @ngInject */
module.config(function($routeProvider) {
  $routeProvider
    .when('/issuer', {
      title: 'Issuer Login',
      templateUrl: requirejs.toUrl('authio-demo/issuer/login.html')
    })
    .when('/issuer/dashboard', {
      title: 'Issuer Dashboard',
      templateUrl: requirejs.toUrl('authio-demo/issuer/dashboard.html')
    })
    .when('/issuer/acknowledgements', {
      title: 'Issuer Acknowledgements',
      templateUrl: requirejs.toUrl('authio-demo/issuer/acknowledgements.html')
    });
});

return module.name;

});
