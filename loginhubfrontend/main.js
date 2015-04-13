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


module.controller('FormController', function() {
  var self = this;
  self.name = '';
  


 self.login = function(username,password) {
    console.log(username)
    console.log(password)
  };
  });








return module.name;
});
