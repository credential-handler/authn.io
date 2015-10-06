define(['angular'], function(angular) {

'use strict';

/* @ngInject */
function factory($http, $scope, brAlertService, config, ipCookie) {
  var self = this;
  self.identity = null;
  self.loading = true;

  var operation;

  navigator.credentials.getPendingOperation({
    agentUrl: '/agent?route=params'
  }).then(function(op) {
    operation = op;
    if(op.name === 'get') {
      self.request = op.options;
      return _getCredentials(self.request);
    } else {
      return Promise.resolve(op.credential);
    }
  }).then(function(identity) {
    self.identity = identity;
  }).catch(function(err) {
    brAlertService.add('error', err);
  }).then(function() {
    self.loading = false;
    $scope.$apply();
  });

  self.complete = function(identity) {
    operation.complete(identity, {
      agentUrl: '/agent?op=' + operation.name + '&route=result'
    }).catch(function(err) {
      console.error('Failed to ' + operation.name + ' credential', err);
      brAlertService.add(
        'error', 'Failed to ' + operation.name + ' the credential.');
    }).then(function() {
      $scope.$apply();
    });
  };

  // gets credentials for the identity composer
  function _getCredentials(request) {
    var did = ipCookie('did');
    if(!did) {
      return Promise.reject(
        new Error('Not authenticated. Please restart the demo.'));
    }
    return Promise.resolve(
      $http.post('/idp/credentials/public-key', request.publicKey))
      .then(function(response) {
        if(response.status !== 200) {
          throw response;
        }
        return response.data;
      }).then(function(identity) {
        // add any credentials from local storage
        var credentials = _loadCredentials();
        credentials = credentials[did] || {};
        credentials = Object.keys(credentials).map(function(key) {
          return credentials[key];
        });
        identity.credentials.push.apply(identity.credentials, credentials);
        return identity;
      });
  }

  // stores credentials in session storage
  function _storeCredentials(identity) {
    var all = _loadCredentials();
    var owned = all[identity.id] || {};
    angular.forEach(identity.credentials, function(credential) {
      owned[credential['@graph'].id] = credential;
    });
    all[identity.id] = owned;
    sessionStorage.setItem('authio.idp.credentials', JSON.stringify(all));
  }

  // loads credentials from session storage
  function _loadCredentials() {
    var credentials = sessionStorage.getItem('authio.idp.credentials');
    if(!credentials) {
      return {};
    }
    try {
      credentials = JSON.parse(credentials);
    } catch(err) {
      credentials = {};
    }
    return credentials;
  }
}

return {aiodCredentialManagerController: factory};

});
