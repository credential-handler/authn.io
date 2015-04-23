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
    when('/register', {
      title: 'Register',
      templateUrl: requirejs.toUrl('components/register.html')
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
      templateUrl: requirejs.toUrl('components/update-account.html')
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

module.controller('RegisterController', function($scope, $http, $window, DataService, brAlertService) {
  var self = this;
  self.passwordConfirmation = '';
  self.password = '';
  self.username = '';
    console.log('DataService.get(idp)', DataService.get('idpInfo'));

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
      console.log('start key generation ');

      // TODO: Put spinner while key is generating
      var keypair = rsa.generateKeyPair({bits: 2048, e: 0x10001});
      
      //places private key in browsers local storage
      localStorage.setItem(hash, JSON.stringify(keypair.privateKey));
      // to retrieve the private key, do the following
      // var privateKey = localStorage.getItem(hash)

      var userDID = 'did:' + DataService.uuid();

      console.log('end key generation');

      var DidDocument = {
        did: userDID,
        publicKeys: [keypair.publicKey],
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

      //Stores the DID
      Promise.resolve($http.post('/storeDID/', data))
        .then(function(response) {
          console.log(response.data);
          if(response.data == "Failed to create user"){
            brAlertService.add('error', 
            'Could not create account. Use a different login/pw.'); 
          }
          else{
            console.log("Success");
            console.log("idpInfo", DataService.get('idpInfo'));
            DataService.redirect('/');
            $scope.$apply();
          }
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

  if(config.data.credential) {
    DataService.set('credential', config.data.credential);
    console.log('DataService.get(credential)', DataService.get('credential'));
  }
  if(config.data.idp) {
    DataService.set('idpInfo', config.data.idp);
  }
  if(config.data.callback) {
    DataService.set('callback', config.data.callback);
    console.log('DataService.get(callback)', DataService.get('callback'));
  }
  console.log('config.data', config.data);
  console.log('DataService.get(idp)', DataService.get('idpInfo'));

  self.login = function(username,password) {
    //TODO: fix hash to use delimeters or any other improvements
    var md = forge.md.sha256.create();
    md.update(username + password);
    var loginHash = md.digest().toHex();

    var privateKey = localStorage.getItem(loginHash);

    Promise.resolve($http.get('/DID',{params:{hashQuery:loginHash}}))
      .then(function(response) {
        console.log('response from GET /DID', response);

        // On a new device, need to do something

        //possible outcome
        // lead to IDP, which we can retrieve
        // Then have idp give authorization to create a key pair for them
        if(!privateKey){

        }

        // Coming from credential consumer
        else if(DataService.get('credential')) {
          Promise.resolve($http.get('/DID/Idp',{params:{did:response.data}}))
            .then(function(response) {
              console.log('/DID/Idp response.data', response.data);
              // TODO: Post to idp (start the key dance)
              $window.location.href = DataService.get('callback');
            })  
            .catch(function(err) {

            })
            .then(function() {
              $scope.$apply();
            });
        }

        // Coming from IDP site
        else if(DataService.get('idpInfo')) {
          Promise.resolve($http.post('/DID/Idp', {
            did: response.data,
            idp: DataService.get('idpInfo')
          }))
            .then(function(){
              // idp succesfully registered to did
              console.log('Idp succesfully registered to did.');
              $window.location.href = DataService.get('callback');
            })
            .catch(function(err){
              console.log('There was an error', err);
              brAlertService.add('error', 
                'Idp unable to be registered'); 
            })
            .then(function() {
              $scope.$apply();
            }); 
        }

        //Logged in, but nothing to do..?
        else {

        }


        // succesful login
        // TODO: Post data to callback? (credential consummer?)
        // console.log('callback', DataService.get('callback'));
        // DataService.redirect(DataService.get('callback'));
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

module.controller('UpdateAccountController', function($http, config, DataService, brAlertService) {
  var self = this;

  self.updateAccount = function(oldUsername, oldPassword, newUsername, newPassword, newPasswordDuplicate){
    if(newPassword != newPasswordDuplicate){
      brAlertService.add('error', 'New passwords do not match!');
    }
    else {

    var md = forge.md.sha256.create();
    md.update(oldUsername + oldPassword);
    var oldLoginHash = md.digest().toHex();

    // verify that entered account exists, by finding the associated DID
    Promise.resolve($http.get('/DID',{params:{hashQuery:oldLoginHash}}))
      .then(function(response) {
        
        // got did, now make request to change hash
        var did = response.data;
        var md = forge.md.sha256.create();
        md.update(newUsername + newPassword);
        var newLoginHash = md.digest().toHex();
        Promise.resolve($http.post('/DID/loginHash', {DID:did, loginHash:newLoginHash}))
          .then(function(response) {
            var privateKey = localStorage.get(oldLoginHash);
            if(privateKey){
              localStorage.setItem(newLoginHash, privateKey);
              localStorage.removeItem(oldLoginHash);
            }
            else{
              // there was never a private key here?
            }
            DataService.redirect('/');
          })
          .catch(function(err) {
            brAlertService.add('error', 'Something went wrong, changes not applied');
          })
          .then(function() {
            $scope.$apply();
          });
      })
      .catch(function(err) {
        brAlertService.add('error', 'Invalid Login information');
      })
      .then(function() {
        $scope.$apply();
      });

    }

  };
});

return module.name;
});
