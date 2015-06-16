define([], function() {

'use strict';

/* @ngInject */
function factory($scope, $http, $location, brAlertService) {
  var self = this;
  self.idp = window.data.idp;
  self.action = 'request';

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
