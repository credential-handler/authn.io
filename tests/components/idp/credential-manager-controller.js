define(['angular'], function(angular) {

'use strict';

/* @ngInject */
function factory($scope, $http, $location, brAlertService, config) {
  var self = this;
  var idp = config.data.idp;
  self.identity = idp.identity;
  self.action = 'request';
  self.composed = null;
  if(config.data.query) {
    self.query = angular.copy(config.data.query);
    // FIXME
    delete self.query.publicKey;
    delete self.query['@context'];
  }
  console.log('query', self.query);
  console.log('identity', self.identity);

  if($location.search().action === 'store') {
    self.action = 'store';
  }

  // transmit the selected credential to the requestor
  self.transmit = function(identity) {
    navigator.credentials.transmit(identity, {
      responseUrl: idp.credentialCallbackUrl
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
          responseUrl: idp.storageCallbackUrl
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
