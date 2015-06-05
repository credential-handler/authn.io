define([
  'angular',
  'forge/forge',
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

  self.generateCredential = function() {
    Promise.resolve($http.post('/issuer/credentials', {
      credential: [{
        '@context': 'https://w3id.org/identity/v1',
        id: window.data.baseUri + '/issuer/credentials/' + Date.now(),
        type: 'PassportCredential',
        claim: {
          id: window.data.issuer.identity.id,
          name: 'Pat Doe',
          country: 'USA',
          governmentId: '123-45-6789',
          documentId: '27384-5322-53332'
        }
      }, {
        '@context': 'https://w3id.org/identity/v1',
        id: window.data.baseUri + '/issuer/credentials/' + (Date.now() + 1),
        type: 'ProofOfAgeCredential',
        claim: {
          id: window.data.issuer.identity.id,
          ageOver: 21
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
          window.data.baseUri + '/issuer/dashboard?storage=status'
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
