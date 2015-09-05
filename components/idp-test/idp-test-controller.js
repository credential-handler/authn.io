define([
  'underscore',
  'node-uuid'
], function(_, uuid) {

'use strict';

/* @ngInject */
function factory($scope, config, $location, ipCookie) {
  var self = this;
  self.idp = {};
  self.idp.url = null;
  self.idp.query = null;
  self.idp.credential = null;
  self.display = {};
  self.display.form = true;
  self.display.identity = false;
  self.display.credential = false;
  self.requestTypes = ['Credential Query', 'Credential Storage'];
  self.requestType = null;

  var _display = function(section) {
    // hide all
    _.each(self.display, function(value, key, list) {
      self.display[key] = false;
    });
    // display section
    self.display[section] = true;
  };

  if(config.data.authio && config.data.authio.identity) {
    self.identity = config.data.authio.identity;
    _display('identity');
  }

  if(config.data.authio && config.data.authio.credential) {
    self.credential = config.data.authio.credential;
    _display('credential');
  }

  var idpTestFormData = ipCookie('idpTestFormData');
  if(idpTestFormData) {
    self.idp.url = idpTestFormData.url;
    self.idp.query = idpTestFormData.query;
    self.idp.credential = idpTestFormData.credential;
    self.requestType = idpTestFormData.requestType;
  }

  // refresh the session cookie
  // NOTE: session is currently unused in this module
  var session = ipCookie('session');
  // refresh session
  ipCookie('session', session, {
    expires: 30,
    expirationUnit: 'days'
  });

  var _saveFormData = function() {
    idpTestFormData = {};
    idpTestFormData.url = self.idp.url;
    idpTestFormData.query = self.idp.query;
    idpTestFormData.credential = self.idp.credential;
    idpTestFormData.requestType = self.requestType;
    ipCookie('idpTestFormData', idpTestFormData, {
      expires: 30,
      expirationUnit: 'days'
    });
  };

  self.send = function() {
    _saveFormData();
    var id = uuid.v4();
    if(self.requestType === 'Credential Query') {
      // NOTE: id parameter is not presently used in the mock
      var authioCallback =
        config.data.baseUri + '/test/credentials/composed-identity?id=' + id;
      try {
        navigator.credentials.request(JSON.parse(self.idp.query), {
          requestUrl: self.idp.url,
          credentialCallback: authioCallback
        });
      } catch(err) {
        alert(err);
      }
    } else if(self.requestType === 'Credential Storage') {
      // NOTE: id is not presently used in the mock
      var authioCallback =
        config.data.baseUri + '/test/credentials/stored-credential?id=' + id;
      try {
        navigator.credentials.store(JSON.parse(self.idp.credential), {
          requestUrl: self.idp.url,
          storageCallback: authioCallback
        });
      } catch(err) {
        alert(err);
      }
    }
  };

  self.clearForm = function(field) {
    if(field) {
      self.idp[field] = null;
    } else {
      _.each(self.idp, function(value, key, list) {
        self.idp[key] = null;
      });
    }
  };

  self.startOver = function() {
    _display('form');
  };

  self.generateCredential = function() {
    var mockCredential = {
      "@context": [
        "https://w3id.org/identity/v1",
        "https://w3id.org/credentials/v1",
        {
          "br": "urn:bedrock:"
        }
      ],
      "id": "did:27129b93-1188-4ef7-a5f2-519a98a5ca54",
      "credential": [{
        "@graph": {
          "@context": "https://w3id.org/credentials/v1",
          "id": "https://example.com/credentials/" + uuid.v4(),
          "type": [
            "Credential",
            "br:test:EmailCredential"
          ],
          "name": "Test 1: Work Email",
          "issued": "2015-01-01T01:02:03Z",
          "issuer": "did:3c188385-d415-4ffc-ade9-32940f28c5a1",
          "claim": {
            "id": "did:27129b93-1188-4ef7-a5f2-519a98a5ca54",
            "email": "individual@examplebusiness.com"
          },
          "signature": {
            "type": "GraphSignature2012",
            "created": "2015-01-01T01:02:03Z",
            "creator": "https://staging-idp.truecred.com/i/demo/keys/1",
            "signatureValue": "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz01234567890ABCDEFGHIJKLM=="
          }
        }
      }]
    };
    self.idp.credential = JSON.stringify(mockCredential);
  };
}

return {IdpTestController: factory};

});
