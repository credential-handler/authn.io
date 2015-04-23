define([
  'angular', 
  'underscore',
  'forge/forge',
  './update-account/update-account',
  './register/register',
  './login/login'
], function(
  angular,_,forge
) {

'use strict';

// password / salt / encryption method / number of iterations.

var module = angular.module('app.loginhub',['app.login', 'app.register', 'app.update-account', 'bedrock.alert']);

/* @ngInject */
module.config(function($routeProvider) {
  $routeProvider.
    when('/', {
      title: 'Main',
      templateUrl: requirejs.toUrl('components/login/login.html')
    }).
    when('/register', {
      title: 'Register',
      templateUrl: requirejs.toUrl('components/register/register.html')
    }).
    when('/idp', {
      title: 'Idp',
      templateUrl: requirejs.toUrl('components/idp.html')
    }).
    when('/cc', {
      title: "Credential Consumer",
      templateUrl: requirejs.toUrl('components/cc.html')
    }).
    when('/updateaccount', {
      title: "Update Login Info",
      templateUrl: requirejs.toUrl('components/update-account/update-account.html')
    });
});

module.service('DataService', function($location) {
  var savedData = {}
  function set(key, value) {
    console.log('key', key);
    savedData[key] = value;
  }
  function get(key) {
    console.log('key get', savedData);
    return savedData[key];
  }
  function uuid() {
    return (function(a,b){for(b=a='';a++<36;b+=a*51&52?(a^15?8^Math.random()*(a^20?16:4):4).toString(16):'-');return b;})();
  };
  function redirect(url) {
    $location.path(url);
  }
  return {
    set: set,
    get: get,
    uuid: uuid,
    redirect: redirect
  }
});







return module.name;
});
