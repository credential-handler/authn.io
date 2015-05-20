define([
  'angular',
  'underscore',
  'forge/forge',
  'did-io',
  './create-alias/create-alias',
  './register/register',
  './login/login',
  './new-device/new-device',
  './credentials-approve/credentials-approve'
], function(
  angular, _, forge, didio
) {

'use strict';

var module = angular.module('app.loginhub',['app.login', 'app.register', 'app.create-alias', 'app.new-device', 'app.credentials-approve', 'bedrock.alert']);

/* @ngInject */
module.config(function($routeProvider) {
  $routeProvider.
    when('/', {
      title: 'Login Hub Information',
      templateUrl: requirejs.toUrl('components/info/info.html')
    }).
    when('/new-device', {
      title: 'Register Device',
      templateUrl: requirejs.toUrl('components/new-device/new-device.html')
    }).
    when('/register', {
      title: 'Register',
      templateUrl: requirejs.toUrl('components/register/register.html')
    }).
    when('/register/idp-error', {
      title: 'Need Identity Provider',
      templateUrl: requirejs.toUrl('components/register/idp-error.html')
    }).
    when('/idp', {
      title: 'Idp',
      templateUrl: requirejs.toUrl('components/idp.html')
    }).
    when('/cc', {
      title: "Credential Consumer",
      templateUrl: requirejs.toUrl('components/cc.html')
    }).
    when('/create-alias', {
      title: "Create alias account",
      templateUrl: requirejs.toUrl('components/create-alias/create-alias.html')
    }).
    when('/credentials-request', {
      title: "Credentials Request",
      templateUrl: requirejs.toUrl('components/login/login.html')
    }).
    when('/create-identity', {
      title: "Create Identity",
      templateUrl: requirejs.toUrl('components/register/register.html')
    })
    .when('/idp-redirect', {
      title: "Redirecting",
      templateUrl: requirejs.toUrl('components/idp-redirect.html')
    })
    .when('/credentials-approve', {
      title: "Redirecting",
      templateUrl: requirejs.toUrl('components/credentials-approve/credentials-approve.html')
    });
});

module.service('DataService', function($location, $window) {
  var savedData = {};
  var self = this;

  function set(key, value) {
    savedData[key] = value;
  };
  function get(key) {
    return savedData[key];
  };
  function getUrl(idp) {
    // FIXME: Do actual IDP DID lookup
    return $location.protocol() + '://' + $location.host() + ':' +
      $location.port() + '/idp';
  };
  function redirect(url) {
    $window.location.href = url;
  };

  // must either pass in the callback and idpUrl
  // or have it in the DataService's savedData
  function postToIdp(callback, idpUrl) {
    callback = callback || savedData['callback'];

    var queryUrl = idpUrl || savedData['idp'];

    var credentialRequest = savedData['credential'];

    console.log("Creating mapping to " + callback + " from idp: " + queryUrl);

    var id = uuid();
    sessionStorage.setItem(id, callback);

    queryUrl += '?id=' + id;

    var queryString = escapeHtml(JSON.stringify(credentialRequest));
    var form = document.createElement('form');
    form.setAttribute('method', 'post');
    form.setAttribute('action', queryUrl);
    form.innerHTML =
    '<input type="hidden" name="callerData" value="' + queryString + '" />';
    form.submit();

    function escapeHtml(str) {
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }
  }

// password / salt / encryption method / number of iterations.

  return {
    set: set,
    get: get,
    getUrl: getUrl,
    redirect: redirect,
    postToIdp: postToIdp,
    decryptDid: didio.decrypt,
    encryptDid: didio.encrypt
  };
});

return module.name;
});
