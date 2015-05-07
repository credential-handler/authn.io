define([
  'angular',
  'underscore',
  'forge/forge',
  './create-alias/create-alias',
  './register/register',
  './login/login',
  './new-device/new-device'
], function(
  angular, _, forge
) {

'use strict';

var module = angular.module('app.loginhub',['app.login', 'app.register', 'app.create-alias', 'app.new-device', 'bedrock.alert']);

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
    });
});

module.service('DataService', function($location, $http) {
  var savedData = {};
  function set(key, value) {
    savedData[key] = value;
  };
  function get(key) {
    return savedData[key];
  };
  function uuid() {
    // jscs: disable
    return (function(a,b){for(b=a='';a++<36;b+=a*51&52?(a^15?8^Math.random()*(a^20?16:4):4).toString(16):'-');return b;})();
    // jscs: enable
  };
  function redirect(url) {
    $location.path(url);
  };

  // must either pass in the callback and idpUrl
  // or have it in the DataService's savedData
  function postToIdp(callback, idpUrl) {
    callback = callback || savedData['callback'];
    var queryUrl = idpUrl || savedData['idpInfo'].url;

    console.log("Creating mapping to " + callback + " from idp: " + queryUrl);
    // heads over to idp
    Promise.resolve($http.post('/callbacks/', {callback: callback}))
      .then(function(response) {
        queryUrl += '?callback=' + response.data;
        queryUrl += '&credential=' + 'address';
        var form = document.createElement('form');
        form.setAttribute('method', 'post');
        form.setAttribute('action', queryUrl);
        form.submit();
      });
  }

  function encryptDid(did, password) {
    var pwKeyHashMethod = 'PKCS5';
    var encryptionMethod = 'AES-GCM';

    var salt = forge.random.getBytesSync(128);

    var numIterations = 5;

    var key = forge.pkcs5.pbkdf2(password, salt, numIterations, 16);

    var iv = forge.random.getBytesSync(16);
    var cipher = forge.cipher.createCipher('AES-GCM', key);

    cipher.start({
      iv: iv, // should be a 12-byte binary-encoded string or byte buffer
      tagLength: 128 // optional, defaults to 128 bits
    });
    cipher.update(forge.util.createBuffer(did));
    cipher.finish();
    var encrypted = forge.util.encode64(cipher.output.getBytes());
    var tag = forge.util.encode64(cipher.mode.tag.getBytes());
    var iv64 = forge.util.encode64(iv);

    var edid = {
      pwKeyHashMethod: pwKeyHashMethod,
      numIterations: numIterations,
      salt: salt,
      encryptionMethod: encryptionMethod,
      authTag: tag,
      key: key,
      iv: iv64,
      encrypted: encrypted
    };

    var encryptedDid = JSON.stringify(edid);

    return encryptedDid;
  };

  function decryptDid(edid, password) {
    //first order of business, get the did out of the response. it is now an
    // encrypted did
    // On a new device, need to do something

    var pwKeyHashMethod = edid.pwKeyHashMethod;
    var did = null;
    var key = '';
    var salt = edid.salt;
    var numIterations = edid.numIterations;
    // Checks which method to use for password based key derivation.
    if(pwKeyHashMethod === 'PKCS5') {
      key = forge.pkcs5.pbkdf2(password, salt, numIterations, 16);
    }

    var encryptionMethod = edid.encryptionMethod;

    var pass = false;

    //checks which method was used for encryption.
    if(encryptionMethod === 'AES-GCM') {

      var iv = forge.util.createBuffer(
        forge.util.decode64(edid.iv));

      var authTag = forge.util.createBuffer(
        forge.util.decode64(edid.authTag));

      var decipher = forge.cipher.createDecipher(encryptionMethod, key);
      decipher.start({
        iv:iv,
        tagLength:128,
        tag:authTag
      });

      var encrypted = forge.util.createBuffer(
        forge.util.decode64(edid.encrypted));

      decipher.update(encrypted);
      pass = decipher.finish();
      did = decipher.output.getBytes();
    }
    if(pass) {
      return did;
    } else {
      return null;
    }
  };

// password / salt / encryption method / number of iterations.

  return {
    set: set,
    get: get,
    uuid: uuid,
    redirect: redirect,
    postToIdp: postToIdp,
    decryptDid: decryptDid,
    encryptDid: encryptDid
  };
});

return module.name;
});
