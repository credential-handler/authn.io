define([], function() {

'use strict';

/* @ngInject */
function factory($scope, $http, $window, brAlertService, config) {
  var self = this;
  self.view = 'login';

  var CONTEXT = [
    'https://w3id.org/identity/v1',
    'https://w3id.org/credentials/v1',
    {'br': 'urn:bedrock:'}
  ];

  self.login = function() {
    navigator.credentials.get({
      query: {
        '@context': 'https://w3id.org/identity/v1',
        id: '',
        publicKey: ''
      },
      agentUrl: '/agent?op=get&route=params'
    }).then(function(identity) {
      if(!identity || !identity.id) {
        throw new Error('DID not provided.');
      }
      self.did = identity.id;
      self.view = 'dashboard';
    }).catch(function(err) {
      brAlertService.add('error', err);
    }).then(function() {
      $scope.$apply();
    });
  };

  self.generateCredential = function() {
    Promise.resolve($http.post('/issuer/credentials', {
      '@context': CONTEXT,
      id: self.did,
      credential: [{
        '@graph': {
          '@context': CONTEXT,
          id: config.data.baseUri + '/issuer/credentials/' + Date.now(),
          type: ['Credential', 'br:test:PassportCredential'],
          claim: {
            id: self.did,
            name: 'Pat Doe',
            addressCountry: 'USA',
            'br:test:governmentId': '123-45-6789',
            'br:test:documentId': '27384-5322-53332'
          }
        }
      }, {
        '@graph': {
          '@context': CONTEXT,
          id: config.data.baseUri + '/issuer/credentials/' + (Date.now() + 1),
          type: ['Credential', 'br:test:ProofOfAgeCredential'],
          claim: {
            id: self.did,
            'br:test:ageOver': 21
          }
        }
      }]
    }))
    .then(function(response) {
      console.log('generateCredential', response.data);
      if(response.status !== 200) {
        throw response;
      }
      return response.data;
    }).then(function(identity) {
      return navigator.credentials.store(identity, {
        agentUrl: '/agent?op=store&route=params'
      }).then(function(identity) {
        self.identity = identity;
        self.view = 'acknowledgement';
      });
    }).catch(function(err) {
      console.error('Failed to store credential', err);
      brAlertService.add('error', 'Failed to store credential.');
    }).then(function() {
      $scope.$apply();
    });
  };

  self.home = function() {
    $window.location = config.data.baseUri;
  };
}

return {aiodIssuerController: factory};

});
