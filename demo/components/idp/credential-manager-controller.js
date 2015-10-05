define([], function() {

'use strict';

/* @ngInject */
function factory($http, $scope, brAlertService, config) {
  var self = this;
  self.identity = config.data.idp.identity;
  self.loading = true;

  var operation;

  navigator.credentials.getPendingOperation({
    agentUrl: '/agent?route=params'
  }).then(function(op) {
    operation = op;
    self.loading = false;
    if(op.name === 'get') {
      self.query = op.options;
    } else {
      self.identity = op.credential;
    }
    $scope.$apply();
  });

  self.complete = function(identity) {
    var promise;
    if(operation.name === 'get') {
      promise = Promise.resolve(identity);
    } else {
      promise = Promise.resolve($http.post('/idp/credentials', identity))
        .then(function(response) {
          if(response.status !== 200) {
            throw response;
          }
        });
    }

    promise.then(function() {
      operation.complete(identity, {
        agentUrl: '/agent?op=' + operation.name + '&route=result'
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
