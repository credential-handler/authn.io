define([
  'angular',
  'underscore',
  'forge/forge',
  'did-io',
  './login/login',
  './new-device/new-device',
  './credentials/credentials'
], function(
  angular, _, forge, didio
) {

'use strict';

var module = angular.module('app.authorizationio', [
  'app.login', 'app.new-device', 'app.credentials', 'bedrock.alert']);

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
    when('/consumer/requestor', {
      title: 'Credential Consumer',
      templateUrl: requirejs.toUrl('components/cc.html')
    }).
    when('/consumer/issuer', {
      title: 'Credential Issuer',
      templateUrl: requirejs.toUrl('components/cc.html')
    }).
    when('/credentials-request', {
      title: 'Credentials Request',
      templateUrl: requirejs.toUrl('components/login/login.html')
    }).
    when('/credentials', {
      title: 'Approve Credentials',
      templateUrl: requirejs.toUrl('components/credentials/credentials.html')
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
  function postToIdp(credentialRequestUrl, credentialCallbackUrl, data) {
    var id = Date.now();
    sessionStorage.setItem(id, credentialCallbackUrl);

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
