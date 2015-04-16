define([
  'angular', 'underscore','forge/forge'
], function(
  angular,_,forge
) {

'use strict';

var module = angular.module('app.loginhub',['bedrock.alert']);

/* @ngInject */
module.config(function($routeProvider) {
  $routeProvider.
    when('/', {
      title: 'Main',
      templateUrl: requirejs.toUrl('components/main.html')
    }).
    when('/createDID', {
      title: 'Login',
      templateUrl: requirejs.toUrl('components/main.html')
    }).
    when('/register', {
      title: 'Register',
      templateUrl: requirejs.toUrl('components/register.html')
    });
});

module.factory('DataService', function() {
  var savedData = {}
  function set(data) {
    savedData = data;
  }
  function get() {
    return savedData;
  }
  function uuid() {
    return (function(a,b){for(b=a='';a++<36;b+=a*51&52?(a^15?8^Math.random()*(a^20?16:4):4).toString(16):'-');return b;})();
  };

  return {
    set: set,
    get: get,
    uuid: uuid
  }

});

module.controller('RegisterController', function($scope, $http, DataService, brAlertService) {
  var self = this;
  self.passwordConfirmation = '';
  self.password = '';
  self.username = '';



  console.log(DataService.get());
  self.register = function() {
    // TODO: Add more validation checks
    if(self.password != self.passwordConfirmation) {
      brAlertService.add('error', 
            'Passwords don\'t match'); 
    }
    else if(self.username.length == 0) {
      brAlertService.add('error', 
            'Enter a username'); 
    }
    else {
      var idpInfo = DataService.get();
      var rsa = forge.pki.rsa;
      console.log('start');
      // TODO: Put spinner while key is generating
      var keypair = rsa.generateKeyPair({bits: 2048, e: 0x10001});
      var userDID = 'did:' + DataService.uuid();
      console.log('idp', idpInfo);
      console.log(keypair);
      console.log('end');

      var DidDocument = {
        did: userDID,
        publicKey: keypair.publicKey,
      };

      // TODO: Make this check better
      if(idpInfo != undefined) {
        DidDocument.idp = idpInfo;
      }

      console.log('DidDocument', DidDocument);

      Promise.resolve($http.post('/storeDID/' ,{DidDocument: DidDocument}))
        .then(function(response) {
          console.log(response);
        });

    }
    /*
      generate public/private key
      generate DID
      create DID document (clientside)
        public key
        DID
        IdP
      rest api call to loginhub to create entry in db -> loginhub.com/storeDID
        server checks work, validity, writes to db
        {hash: DID}
        {DID: DID Document}
    */
  }
});

module.controller('FormController', function($scope, $http, config, DataService) {
  var self = this;
  self.name = '';

  console.log('config', config);
  DataService.set(config.data.idpInfo);

  self.login = function(username,password) {
    //TODO: fix hash to use delimeters or any other improvements
    var md = forge.md.sha256.create();
    md.update(username + password);
    Promise.resolve($http.post('/DIDQuery/' ,{hashQuery: md.digest().toHex()}))
      .then(function(response) {
        console.log(response);
      })
      .catch(function(err) {
        console.log('There was an error')
      })
      .then(function() {
        $scope.$apply();
      });
  };
});


return module.name;
});
