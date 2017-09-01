/*!
 * New BSD License (3-clause)
 * Copyright (c) 2015-2017, Digital Bazaar, Inc.
 * Copyright (c) 2015-2017, Accreditrust Technologies, LLC
 * All rights reserved.
 */
/* globals IdentityCredentialRegistration */
import angular from 'angular';

/* @ngInject */
export default function factory(
  $q, $http, $location, ipCookie, brAlertService) {
  var self = this;
  self.repository = 'did:d1d1d1d1-d1d1-d1d1-d1d1-d1d1d1d1d1d1';
  self.username = 'a_' + Math.floor(Math.random() * 100000) + '_b@example.org';
  self.loading = false;

  self.register = function() {
    self.loading = true;
    var registration = new IdentityCredentialRegistration({
      repository: self.repository,
      name: self.username
    });
    $q.resolve(registration.register({
      agentUrl: '/register'
    })).then(function(didDocument) {
      if(!didDocument) {
        throw new Error('Registration canceled.');
      }
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
      return $http.post('/idp/credentials/email', identity);
    }).then(function(response) {
      if(response.status !== 200) {
        throw response;
      }
      _storeCredentials(response.data);
      $location.path('/legacy');
    }).catch(function(err) {
      brAlertService.add('error', err);
    }).then(function() {
      self.loading = false;
    });
  };

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
