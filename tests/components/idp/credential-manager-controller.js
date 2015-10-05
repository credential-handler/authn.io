define([], function() {

'use strict';

/* @ngInject */
function factory($scope, $http, $location, brAlertService, config) {
  var self = this;
  var idp = config.data.idp;
  self.identity = idp.identity;
  self.action = 'request';

  var query = $location.search();
  var operation;

  navigator.credentials.getPendingOperation({
    agentUrl: '/agent?op=' + query.op + '&route=params'
  }).then(function(op) {
    operation = op;
    if(op.name !== query.op) {
      throw new Error('Unexpected credential operation.');
    }
    self.op = op.name;
    if(op.name === 'get') {
      self.params = op.options;
    } else {
      self.params = op.credential;
    }
    $scope.$apply();
  });

  self.complete = function() {
    operation.complete({foo: 'bar'}, {
      agentUrl: '/agent?op=' + operation.name + '&route=result'
    });
  };  
  
  // FIXME: old below
  
  
  
  
  
  
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

return {aoidCredentialManagerController: factory};

});
