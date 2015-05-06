define([
  'angular',
  'forge/forge'
], function(angular, forge) {

'use strict';

var module = angular.module('app.login', ['bedrock.alert', 'ipCookie']);

module.controller('LoginController', function(
  $scope, $http, ipCookie, $window, config, DataService, brAlertService) {
  var self = this;

  if(config.data.credential) {
    DataService.set('credential', config.data.credential);
    //console.log('DataService.get(credential)', DataService.get('credential'));
  }
  if(config.data.idp) {
    DataService.set('idpInfo', config.data.idp);
  }
  if(config.data.callback) {
    DataService.set('callback', config.data.callback);
    //console.log('DataService.get(callback)', DataService.get('callback'));
  }
  //console.log('config.data', config.data);
  //console.log('DataService.get(idp)', DataService.get('idpInfo'));

  self.login = function(username, password) {
    //TODO: fix hash to use delimeters or any other improvements
    var md = forge.md.sha256.create();
    md.update(username + password);
    var loginHash = md.digest().toHex();

    console.log("request hash:", loginHash);

    DataService.set('loginHash', loginHash);

    var privateKey = localStorage.getItem(loginHash);

    Promise.resolve($http.get('/mappings/' + loginHash))
      .then(function(response) {
        console.log('response from GET /mappings/:hash', response);

        var did = null;

        var edid = response.data;

        console.log('EDID', edid);


        var did = DataService.decryptDid(edid, password);

        console.log('DID', did);

        // valid login, but on a new device
        if(did != null && !privateKey) {
          Promise.resolve($http.get('/did/idp', {params:{did:did}}))
            .then(function(response) {
              DataService.set('idpInfo', response.data);
              DataService.redirect('/new-device');
            })
            .catch(function(err) {
              brAlertService.add('error', 'Something went wrong');
            })
            .then(function() {
              $scope.$apply();
            });
        } else if(did != null) {
          Promise.resolve($http.get('/did/idp', {params:{did:did}}))
            .then(function(response) {
              var cookie = {
                idp: response.data,
                did: did
              };
              ipCookie('session', cookie);
            })
            .catch(function(err) {
              brAlertService.add('error', 'Unable to log in.');
              console.log(err);
            });

          // possible outcome
          // lead to IDP, which we can retrieve
          // Then have idp give authorization to create a key pair for them
          // Coming from credential consumer
          if(DataService.get('credential')) {
            console.log("Came from credential consumer");
            Promise.resolve($http.get('/did/idp',{params:{did:did}}))
              .then(function(response) {
                DataService.postToIdp(undefined, response.data.url);
              })
              .catch(function(err) {

              })
              .then(function() {
                $scope.$apply();
              });
          } else if(DataService.get('idpInfo')) {
            // Coming from IDP site
            Promise.resolve($http.post('/did/idp', {
              did: did,
              idp: DataService.get('idpInfo')
            }))
              .then(function() {
                // idp succesfully registered to did
                console.log('Idp succesfully registered to did.');
                $window.location.href = DataService.get('callback');
              })
              .catch(function(err) {
                console.log('There was an error', err);
                brAlertService.add('error', 'Idp unable to be registered');
              })
              .then(function() {
                $scope.$apply();
              });
          } else {
            // Logged in, but nothing to do..?
          }
        } else {
          // pass is false.
          // Bad login, unable to decrypt did with the password.
          brAlertService.add('error', 'Invalid login information');
        }

        // TODO: Post data to callback? (credential consummer?)
        // console.log('callback', DataService.get('callback'));
        // DataService.redirect(DataService.get('callback'));
      })
      .catch(function(err) {
        console.log('There was an error', err);
        brAlertService.add('error', 'Invalid login information');
      })
      .then(function() {
        $scope.$apply();
      });
  };
});


});
