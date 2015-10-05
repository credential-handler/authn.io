define(['angular', './issuer-controller'], function(angular, issuerController) {

'use strict';

var module = angular.module('authio-demo.issuer', ['bedrock.alert']);

module.controller(issuerController);

/* @ngInject */
module.config(function($routeProvider) {
  $routeProvider
    .when('/issuer', {
      title: 'Issuer',
      templateUrl: requirejs.toUrl('authio-demo/issuer/issuer.html')
    });
});

return module.name;

});
