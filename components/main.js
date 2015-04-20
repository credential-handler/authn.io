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
    }).
    when('/idp', {
      title: 'Idp',
      templateUrl: requirejs.toUrl('components/idp.html')
    }).
    otherwise({
      title:'Failed',
      templateUrl: requirejs.toUrl('components/idp.html')
    });
});



module.service('DataService', function($location) {
  var savedData = {}
  function set(key, value) {
    savedData.key = value;
  }
  function get(key) {
    return savedData.key;
  }
  function uuid() {
    return (function(a,b){for(b=a='';a++<36;b+=a*51&52?(a^15?8^Math.random()*(a^20?16:4):4).toString(16):'-');return b;})();
  };
  function redirect(url) {
    //var form = document.createElement('a');
    //form.setAttribute('href', url);
    //form.click();
    $location.path('/');
  }

  return {
    set: set,
    get: get,
    uuid: uuid,
    redirect: redirect
  }

});

module.controller('RegisterController', function($scope, $http, $window, DataService, brAlertService) {
  var self = this;
  self.passwordConfirmation = '';
  self.password = '';
  self.username = '';

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
      var username = self.username;
      var password = self.password;
      var md = forge.md.sha256.create();
      md.update(username + password);
      var hash = md.digest().toHex();
      var idpInfo = DataService.get('idpInfo');
      var rsa = forge.pki.rsa;
      console.log('start');
      // TODO: Put spinner while key is generating
      var keypair = rsa.generateKeyPair({bits: 2048, e: 0x10001}, function(){

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

        var data = {
          DIDDocument: DidDocument,
          DID: userDID,
          loginHash: hash
        }

        console.log("All data sent", data);

        Promise.resolve($http.post('/storeDID/' ,data))
          .then(function(response) {
            console.log(response.data);
            if(response.data == "Failed to create user"){
              brAlertService.add('error', 
              'Could not create account. Use a different login/pw.'); 
            }
            else{
              console.log("Success");
              console.log("idpInfo", DataService.get('idpInfo'));
              DataService.redirect('');
              $scope.$apply();
            }
          });


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

module.controller('LoginController', function($scope, $http, $window, config, DataService, brAlertService) {
  var self = this;
  self.name = '';

  if(config.data.idp) {
    console.log('config.data.idp', config.data.idp);
    DataService.set('idpInfo', config.data.idp);
    console.log('DataService.geT(idp)', DataService.get('idpInfo'));
  }
  if(config.data.callback) {
    console.log('config.data.callback', config.data.callback);
    DataService.set('callback', config.data.callback);
    console.log('DataService.geT(callback)', DataService.get('callback'));
  }
  console.log('config.data', config.data);

  self.login = function(username,password) {
    //TODO: fix hash to use delimeters or any other improvements
    var md = forge.md.sha256.create();
    md.update(username + password);
    Promise.resolve($http.post('/DIDQuery/' ,{hashQuery: md.digest().toHex()}))
      .then(function(response) {
        console.log(response);
        // succesfull login
        // TODO: Post data to callback? (credential consummer?)
        console.log('callback', DataService.get('callback'));
        // DataService.redirect(DataService.get('callback'));
        $window.location.href = DataService.get('callback');
      })
      .catch(function(err) {
        console.log('There was an error', err);
        brAlertService.add('error', 
          'Invalid login information'); 
      })
      .then(function() {
        $scope.$apply();
      });
  };
});

return module.name;
});
