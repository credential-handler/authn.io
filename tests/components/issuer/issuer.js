define([
  'angular',
  'forge/js/forge',
  'did-io',
  'node-uuid'
], function(angular, forge, didiojs, uuid) {

'use strict';

var module = angular.module('authio.issuer', ['bedrock.alert']);
var didio = didiojs({inject: {
  forge: forge,
  uuid: uuid
}});

module.controller('IssuerController', function(
  $scope, $http, $window, config, DataService, brAlertService) {
  var self = this;
  self.identity = window.data.issuer.identity;

  var CONTEXT = [
    'https://w3id.org/identity/v1',
    'https://w3id.org/credentials/v1',
    {
      'br': 'urn:bedrock:'
    }
  ];
  self.generateCredential = function() {
    Promise.resolve($http.post('/issuer/credentials', {
      '@context': CONTEXT,
      id: window.data.issuer.identity.id,
      credential: [{
        '@graph': {
          '@context': CONTEXT,
          id: window.data.baseUri + '/issuer/credentials/' + Date.now(),
          type: ['Credential', 'br:test:PassportCredential'],
          claim: {
            id: window.data.issuer.identity.id,
            name: 'Pat Doe',
            addressCountry: 'USA',
            'br:test:governmentId': '123-45-6789',
            'br:test:documentId': '27384-5322-53332'
          }
        }
      }, {
        '@graph': {
          '@context': CONTEXT,
          id: window.data.baseUri + '/issuer/credentials/' + (Date.now() + 1),
          type: ['Credential', 'br:test:ProofOfAgeCredential'],
          claim: {
            id: window.data.issuer.identity.id,
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
      navigator.credentials.store(identity, {
        requestUrl:
          window.data.baseUri + '/requests?action=store',
        storageCallback:
          window.data.baseUri + '/issuer/acknowledgements'
      });
    }).catch(function(err) {
      console.error('Failed to store credential', err);
      brAlertService.add('error',
        'Failed to store credential.');
    }).then(function() {
      $scope.$apply();
    });
  };
});

});
