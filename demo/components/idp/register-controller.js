define(['angular'], function(angular) {

'use strict';

/* @ngInject */
function factory($scope, $http, $location, ipCookie, brAlertService) {
  var self = this;
  self.idp = 'did:d1d1d1d1-d1d1-d1d1-d1d1-d1d1d1d1d1d1';
  self.username = 'demo-username';
  self.loading = false;

  /**
   * Validates the form, and if valid, performs a registration.
   */
  self.validateForm = function() {
    if($scope.regForm.$valid) {
      _register();
    }
  };

  function _register() {
    self.loading = true;
    IdentityCredential.register({
      idp: self.idp,
      agentUrl: '/register'
    }).then(function(didDocument) {
      var did = didDocument.id;
      ipCookie('did', did, {path: '/'});
      var emailHost = did.split(':')[1];
      var identity = {
        '@context': [
          'https://w3id.org/identity/v1',
          'https://w3id.org/credentials/v1',
          {'br': 'urn:bedrock:'}
        ],
        id: did,
        credential: [{
          '@graph': {
            '@context': [
              'https://w3id.org/identity/v1',
              'https://w3id.org/credentials/v1',
              {'br': 'urn:bedrock:'}
            ],
            type: ['Credential', 'br:test:EmailCredential'],
            claim: {
              id: did,
              email: 'test@' + emailHost + '.example.com'
            }
          }
        }, {
          '@graph': {
            '@context': [
              'https://w3id.org/identity/v1',
              'https://w3id.org/credentials/v1',
              {'br': 'urn:bedrock:'}
            ],
            type: ['Credential', 'br:test:EmailCredential'],
            claim: {
              id: did,
              email: 'test@' + emailHost + '.example.org'
            }
          }
        }]
      };
      return Promise.resolve($http.post('/idp/credentials/email', identity));
    }).then(function(response) {
      if(response.status !== 200) {
        throw response;
      }
      _storeCredentials(response.data);
      $location.path('/');
    }).catch(function(err) {
      brAlertService.add('error', err);
    }).then(function() {
      self.loading = false;
      $scope.$apply();
    });
  }

  // stores credentials in local storage
  // TODO: convert to a service, share w/credential manager controller
  function _storeCredentials(identity) {
    var all = _loadCredentials();
    var owned = all[identity.id] || {};
    angular.forEach(identity.credential, function(credential) {
      owned[credential['@graph'].id] = credential;
    });
    all[identity.id] = owned;
    localStorage.setItem('authio.idp.credentials', JSON.stringify(all));
  }

  // loads credentials from local storage
  function _loadCredentials() {
    var credentials = localStorage.getItem('authio.idp.credentials');
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

return {aiodRegisterController: factory};

});
