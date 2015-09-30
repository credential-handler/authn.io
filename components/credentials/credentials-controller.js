define([
  'underscore',
  'async',
  'forge/js/forge',
  'jsonld',
  'jsonld-signatures'
], function(_, async, forge, jsonld, jsigjs) {

'use strict';

/* @ngInject */
function factory(
  $scope, config, $location, ipCookie, brAlertService, localStorageService) {

  var self = this;
  var requestData = {};
  var keyTypes = {};
  keyTypes.EXISTING = 'existing';
  keyTypes.TEMPORARY = 'temporary';
  keyTypes.NEW = 'new';

  try {
    requestData = JSON.parse(sessionStorage.getItem($location.search().id));
  } catch(err) {
    throw new Error('Could not parse request data.');
  }
  self.requestOwner = requestData.owner;
  self.callback = requestData.callback;
  self.callbackHostName = new URL(self.callback).hostname;
  self.identity = config.data.authio.identity;
  self.transmitDisabled = true;
  self.confirmTransmission = true;
  var trustedDomainPrefix = 'settings.trustedDomains.';
  var trustedDomainKey = trustedDomainPrefix + self.callbackHostName;

  if(self.identity.id !== self.requestOwner &&
    _getOwnerId(self.identity) !== self.requestOwner) {
    brAlertService.add(
      'error', 'Identity document does not correspond with the request.');
    throw new Error('Identity document does not correspond with the request.');
  }
  var session = null;
  var sessionKey = _encodeSessionKey(self.identity.id);
  if(requestData.keyType === keyTypes.EXISTING) {
    session = ipCookie(sessionKey);
    if(session === undefined) {
      // this could be an acknowledgement where the owner is in claim.id
      sessionKey = _encodeSessionKey(_getOwnerId(self.identity));
      session = ipCookie(sessionKey);
    }
    if(session === undefined) {
      // the information in the document does not correspond with an identity
      brAlertService.add('error', 'Active session not found.');
      throw new Error('Active session not found.');
    }
    // refresh session
    ipCookie(sessionKey, session, {
      expires: 120,
      expirationUnit: 'minutes',
      secure: true
    });
  }
  if(requestData.keyType !== keyTypes.EXISTING) {
    try {
      session = JSON.parse(sessionStorage.getItem(sessionKey));
      if(!session) {
        // this could be an acknowledgement where the owner is in claim.id
        sessionKey = _encodeSessionKey(_getOwnerId(self.identity));
        session = JSON.parse(sessionStorage.getItem(sessionKey));
      }
      if(!session) {
        // the information in the document does not correspond with an identity
        brAlertService.add('error', 'Active session not found.');
        throw new Error('Active session not found.');
      }
    } catch(err) {
      console.log('Error: Failed to parse existing session data.');
    }
  }
  // extract the keyInfo if it exists in the session
  self.keyInfo = session.publicKey;

  if(localStorageService.get(trustedDomainKey) === 'bypass') {
    self.confirmTransmission = false;
  }

  // setup custom document loader for identity JSON-LD context
  jsonld = jsonld();
  var _oldLoader = jsonld.documentLoader;
  jsonld.documentLoader = function(url) {
    if(url in config.data.CONTEXTS) {
      return Promise.resolve({
        contextUrl: null,
        document: config.data.CONTEXTS[url],
        documentUrl: url
      });
    }
    return _oldLoader(url);
  };

  // initialize jsig using the AMD-loaded helper libraries
  var jsig = jsigjs({inject: {
    async: async,
    forge: forge,
    jsonld: jsonld,
    _: _
  }});

  // sign the identity
  var signer = {
    privateKeyPem: self.keyInfo.privateKeyPem
  };
  if(self.keyInfo.id) {
    signer.creator = self.keyInfo.id;
  }
  jsig.sign(self.identity, signer, function(err, signedIdentity) {
    if(err) {
      console.log('Error: Signature on identity failed:', err);
    }
    self.identity.signature = signedIdentity.signature;
    if(!self.confirmTransmission) {
      return self.transmitCredentials();
    }
    self.transmitDisabled = false;
    $scope.$apply();
  });

  self.transmitCredentials = function() {
    navigator.credentials.transmit(self.identity, {
      responseUrl: self.callback
    });
  };

  self.setBypass = function() {
    if(self.bypassConfirmation) {
      // bypass option is checked
      localStorageService.set(trustedDomainKey, 'bypass');
    } else {
      // bypass option is not checked
      localStorageService.remove(trustedDomainKey);
    }
  };

  function _encodeSessionKey(key) {
    // NOTE: stripping colon because browser encodes it
    return [key.replace(/[:]/g,''), 'session'].join('.');
  }

  function _getOwnerId(identity) {
    return identity.credential[0]['@graph'].claim.id;
  }
}

return {CredentialsController: factory};

});
