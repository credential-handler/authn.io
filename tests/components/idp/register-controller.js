define([], function() {

'use strict';

/* @ngInject */
function factory($scope, $http, $location, ipCookie, brAlertService) {
  var self = this;
  self.idp = 'did:d1d1d1d1-d1d1-d1d1-d1d1-d1d1d1d1d1d1';
  self.username = '';
  self.loading = false;

  /**
   * Validates the form, and if valid, performs a registration.
   */
  self.validateForm = function() {
    if($scope.regForm.$valid) {
      _register();
    }
  };

  function _register() {
    self.loading = true;
    navigator.credentials.registerDid({
      idp: self.idp,
      agentUrl: '/register'
    }).then(function(didDocument) {
      var did = didDocument.id;
      ipCookie('did', did);
      var exHost = did.split(':')[1];
      var emailCredential = {
        '@context': [
          'https://w3id.org/identity/v1',
          'https://w3id.org/credentials/v1',
          {
            'br': 'urn:bedrock:'
          }
        ],
        id: did,
        credential: [{
          '@graph': {
            '@context': [
              'https://w3id.org/identity/v1',
              'https://w3id.org/credentials/v1',
              {
                'br': 'urn:bedrock:'
              }
            ],
            type: ['Credential', 'br:test:EmailCredential'],
            claim: {
              id: did,
              email: 'test@' + exHost + '.example.com'
            }
          }
        }, {
          '@graph': {
            '@context': [
              'https://w3id.org/identity/v1',
              'https://w3id.org/credentials/v1',
              {
                'br': 'urn:bedrock:'
              }
            ],
            type: ['Credential', 'br:test:EmailCredential'],
            claim: {
              id: did,
              email: 'test@' + exHost + '.example.org'
            }
          }
        }]
      };
      return Promise.resolve($http.post(
        '/idp/credentials', JSON.stringify(emailCredential)))
        .then(function(response) {
          if(response.status !== 200) {
            throw response;
          }
          $location.path('/');
        });
    }).catch(function(err) {
      brAlertService.add('error', err);
    }).then(function() {
      self.loading = false;
      $scope.$apply();
    });
  }
}

return {aiotRegisterController: factory};

});
