define(['angular'], function(angular) {

'use strict';

/* @ngInject */
function factory(
  $scope, $http, $location, $rootScope, brAlertService,
  credFormLibraryService) {
  var self = this;
  self.idp = window.data.idp;
  self.credentials = self.idp.identity.credential.map(function(credential) {
    return credential['@graph'];
  });
  self.action = 'request';
  self.composed = null;
  if(window.data.query) {
    self.query = angular.copy(window.data.query);
    // FIXME
    delete self.query.publicKey;
    delete self.query['@context'];
  }

  self.library = null;
  var library = credFormLibraryService.getLibrary().then(function(library) {
    self.library = library;
    $rootScope.$apply();
  });

  if($location.search().action === 'store') {
    self.action = 'store';
  }

  // transmit the selected credential to the requestor
  self.transmit = function(identity) {
    navigator.credentials.transmit(identity, {
      responseUrl: self.idp.credentialCallbackUrl
    });
  };

  self.store = function(identity) {
    Promise.resolve($http.post('/idp/credentials', identity))
      .then(function(response) {
        if(response.status !== 200) {
          throw response;
        }
      }).then(function() {
        navigator.credentials.transmit(identity, {
          responseUrl: self.idp.storageCallbackUrl
        });
      }).catch(function(err) {
        console.error('Failed to store credential', err);
        brAlertService.add('error', 'Failed to store the credential.');
      }).then(function() {
        $scope.$apply();
      });
  };
}

return {CredentialManagerController: factory};

});
