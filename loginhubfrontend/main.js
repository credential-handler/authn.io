define([
  'angular'
], function(
  angular
) {

'use strict';

var module = angular.module('app.loginhubfrontend',[]);

/* @ngInject */
module.config(function($routeProvider) {
  $routeProvider.when('/', {
    title: 'Main',
   templateUrl: requirejs.toUrl('loginhubfrontend/main.html')
  });
});


console.log("Worked");





return module.name;
});