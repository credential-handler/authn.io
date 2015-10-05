define([], function() {

'use strict';

/* @ngInject */
function factory($scope, $window, brAlertService, config) {
  var self = this;
  self.view = 'request';

  var CONTEXT = [
    'https://w3id.org/identity/v1',
    'https://w3id.org/credentials/v1',
    {'br': 'urn:bedrock:'}
  ];

  self.get = function() {
    navigator.credentials.get({
      query: {
        '@context': 'https://w3id.org/identity/v1',
        // TODO: change to passport
        email: ''
      },
      agentUrl: '/agent?op=get&route=params'
    }).then(function(identity) {
      self.identity = identity;
      self.view = 'response';
    }).catch(function(err) {
      brAlertService.add('error', err);
    }).then(function() {
      $scope.$apply();
    });
  };

  self.home = function() {
    $window.location = config.data.baseUri;
  };
}

return {aiodConsumerController: factory};

});
