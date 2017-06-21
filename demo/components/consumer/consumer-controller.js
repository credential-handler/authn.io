/*!
 * New BSD License (3-clause)
 * Copyright (c) 2015-2016, Digital Bazaar, Inc.
 * Copyright (c) 2015-2016, Accreditrust Technologies, LLC
 * All rights reserved.
 */

/* @ngInject */
export default function factory($q, $window, brAlertService, config) {
  var self = this;
  self.view = 'request';

  var CONTEXT = [
    'https://w3id.org/identity/v1',
    'https://w3id.org/credentials/v1',
    {'br': 'urn:bedrock:'}
  ];

  self.get = function() {
    $q.resolve(navigator.credentials.get({
      identity: {
        query: {
          '@context': {
            'br': 'urn:bedrock:',
            'cred': 'https://w3id.org/credentials#'
          },
          'br:test:passport': {'cred:isOptional': true}
        },
        agentUrl: '/agent'
      }
    })).then(function(credential) {
      if(!credential) {
        throw new Error('No credential provided.');
      }
      self.identity = credential.identity;
      self.view = 'response';
    }).catch(function(err) {
      brAlertService.add('error', err);
    });
  };

  self.home = function() {
    $window.location = config.data.baseUri;
  };
}
