/*!
 * New BSD License (3-clause)
 * Copyright (c) 2015-2016, Digital Bazaar, Inc.
 * Copyright (c) 2015-2016, Accreditrust Technologies, LLC
 * All rights reserved.
 */
import angular from 'angular';
import jsonld from 'jsonld';

/* @ngInject */
export default function factory(
  $http, $q, $rootScope, brAlertService, config, ipCookie) {
  var self = this;
  self.identity = null;
  self.credentials = [];
  self.loading = true;

  var operation;

  $q.resolve(navigator.credentials.getPendingOperation({
    agentUrl: '/agent'
  })).then(function(op) {
    operation = op;
    if(op.name === 'get') {
      self.view = 'get';
      self.query = op.options.query;
      return _getCredentials(op.options.identity);
    } else {
      self.view = 'store';
      return $q.resolve(op.options.store);
    }
  }).then(function(identity) {
    self.identity = identity;
    var credentials = jsonld.getValues(
      self.identity, 'credential').map(function(credential) {
        return jsonld.promises.compact(credential['@graph'], {
          '@context': 'https://w3id.org/credentials/v1'
        });
      });
    return $q.all(credentials);
  }).then(function(credentials) {
    self.credentials = credentials;
  }).catch(function(err) {
    brAlertService.add('error', err);
  }).then(function() {
    self.loading = false;
  });

  self.complete = function(identity) {
    if(identity && operation.name === 'store') {
      _storeCredentials(identity);
    }
    operation.complete(identity, {
      agentUrl: '/agent'
    });
  };

  // gets credentials for the identity composer
  function _getCredentials(identity) {
    var did = ipCookie('did');
    if(!did) {
      return $q.reject(
        new Error('Not authenticated. Please restart the demo.'));
    }
    var publicKey = identity.credential['@graph'].claim.publicKey;
    return $http.post('/idp/credentials/public-key', publicKey)
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
        identity.credential.push.apply(identity.credential, credentials);
        return identity;
      });
  }

  // stores credentials in local storage
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
