/*!
 * New BSD License (3-clause)
 * Copyright (c) 2015-2016, Digital Bazaar, Inc.
 * Copyright (c) 2015-2016, Accreditrust Technologies, LLC
 * All rights reserved.
 */
define([], function() {

'use strict';

/* @ngInject */
function factory($scope, $http, $window, brAlertService, config) {
  var self = this;
  self.view = 'login';

  var CONTEXT = [
    'https://w3id.org/identity/v1',
    'https://w3id.org/credentials/v1',
    {'br': 'urn:bedrock:'}
  ];

  self.login = function() {
    navigator.credentials.get({
      identity: {
        query: {
          '@context': 'https://w3id.org/identity/v1',
          id: '',
          publicKey: ''
        },
        agentUrl: '/agent'
      }
    }).then(function(identity) {
      if(!identity || !identity.identity || !identity.identity.id) {
        throw new Error('DID not provided.');
      }
      self.did = identity.identity.id;
      return _generateCredentials();
    }).then(function(identity) {
      self.identity = identity;
      self.view = 'dashboard';
    }).catch(function(err) {
      brAlertService.add('error', err);
    }).then(function() {
      $scope.$apply();
    });
  };

  self.issueCredentials = function() {
    return navigator.credentials.store(new IdentityCredential(self.identity), {
      agentUrl: '/agent'
    }).then(function(identity) {
      self.identity = identity;
      self.view = 'acknowledgement';
    }).catch(function(err) {
      console.error('Failed to store credential.', err);
      brAlertService.add('error', 'Failed to store credential.');
    }).then(function() {
      $scope.$apply();
    });
  };

  self.home = function() {
    $window.location = config.data.baseUri;
  };

  function _generateCredentials() {
    var dateTime = new Date().toJSON();
    return Promise.resolve($http.post('/issuer/credentials', {
      '@context': CONTEXT,
      id: self.did,
      credential: [{
        "@graph": {
          "@context": CONTEXT,
          "id": config.data.baseUri + '/issuer/credentials/' + Date.now(),
          "type": ["Credential", "br:test:PassportCredential"],
          "name": "Passport",
          "issued": dateTime,
          "issuer": "urn:issuer:test",
          "image": "http://simpleicon.com/wp-content/uploads/global_1-128x128.png",
          "claim": {
            "id": self.did,
            "name": "Pat Doe",
            "image": "http://simpleicon.com/wp-content/uploads/business-woman-2-128x128.png",
            "schema:birthDate": {
              "@value": "1980-01-01T00:00:00Z",
              "@type": "xsd:dateTime"
            },
            "schema:gender": "female",
            "schema:height": "65in",
            "br:test:eyeColor": "blue",
            "schema:nationality": {
              "name": "United States"
            },
            "address": {
              "type": "PostalAddress",
              "streetAddress": "1 Main St.",
              "addressLocality": "Blacksburg",
              "addressRegion": "Virginia",
              "postalCode": "24060",
              "addressCountry": "US"
            },
            "br:test:passport": {
              "type": "br:test:Passport",
              "name": "Test Passport",
              "br:test:documentId": Date.now().toString(),
              "issuer": "https://example.gov/",
              "issued": "2010-01-07T01:02:03Z",
              "expires": "2020-01-07T01:02:03Z"
            }
          },
          "signature": {
            "type": "GraphSignature2012",
            "created": "2015-01-09T01:02:03Z",
            "creator": "https://idp.identus.dev:38443/i/demo/keys/1",
            "signatureValue": "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz01234567890ABCDEFGHIJKLM=="
          }
        }
      }, {
        '@graph': {
          '@context': CONTEXT,
          id: config.data.baseUri + '/issuer/credentials/' + (Date.now() + 1),
          type: ['Credential', 'br:test:ProofOfAgeCredential'],
          claim: {
            id: self.did,
            'br:test:ageOver': 21
          }
        }
      }]
    }))
    .then(function(response) {
      if(response.status !== 200) {
        throw response;
      }
      return response.data;
    }).catch(function(err) {
      console.error('Failed to generate credential.', err);
      throw err;
    });
  }
}

return {aiodIssuerController: factory};

});
