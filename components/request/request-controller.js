define([
  'forge/js/forge',
  'did-io',
  'node-uuid'
], function(forge, didiojs, uuid) {

'use strict';

/* @ngInject */
function factory(
  $scope, $http, $location, ipCookie, config, brAlertService,
  localStorageService) {
  var self = this;
  self.generating = false;
  self.keyInfo = {};
  self.keyType = null;

  self.publicComputer = false;
  self.identities = {};
  self.identitySelected = false;
  self.display = {};
  self.display.storageRequest = false;
  self.display.identityChooser = false;
  self.display.newIdentity = false;
  var pki = forge.pki;
  var didio = didiojs({inject: {
    forge: forge,
    uuid: uuid
  }});
  var keyTypes = {};
  keyTypes.EXISTING = 'existing';
  keyTypes.TEMPORARY = 'temporary';
  keyTypes.NEW = 'new';

  /**
   * Helper method to generate a temporary keypair asynchronously.
   *
   * @return a promise that resolves to a keypair, or rejects with the error.
   */
  self._generateTemporaryKey = function() {
    return new Promise(function(resolve, reject) {
      // skip temporary key generation if this is not a public computer
      if(!self.publicComputer) {
        return resolve();
      }
      self.generating = true;
      $scope.$apply();
      forge.pki.rsa.generateKeyPair({
        bits: 2048,
        workerScript: '/bower-components/forge/js/prime.worker.js'
      }, function(err, keypair) {
        self.generating = false;
        $scope.$apply();
        if(err) {
          return reject(err);
        }
        // generate the sha-256 public key fingerprint
        var fingerprint = pki.getPublicKeyFingerprint(keypair.publicKey, {
          md: forge.md.sha256.create(),encoding: 'hex', delimiter: ':'
        });

        return resolve({
          id: 'urn:rsa-public-key-sha256:' + fingerprint,
          publicKeyPem: forge.pki.publicKeyToPem(keypair.publicKey),
          privateKeyPem: forge.pki.privateKeyToPem(keypair.privateKey)
        });
      });
    });
  };

  /**
   * Display Identity Chooser
   */
  self.identityChooser = function() {
    if(config.data.storageRequest) {
      if(_getOwnerId(config.data.storageRequest)) {
        _display('storageRequest');
        var owner = _getOwnerId(config.data.storageRequest);
        return self.redirect({owner: owner});
      }
    }
    var identities = localStorage.getItem('identities');
    if(!identities) {
      self.publicComputer = true;
      self.identities = {};
      _display('newIdentity');
      return;
    }
    if(identities) {
      try {
        self.identities = JSON.parse(identities);
        _display('identityChooser');
      } catch(err) {
        console.log('Error: Failed to parse existing identities.');
      }
    }
  };

  /**
   * Attempt to redirect the browser if a session exists.
   */
  self.redirect = function(identity, loginForm) {
    try {
      var sessionKey = _encodeSessionKey(identity.owner);
      var session = ipCookie(sessionKey);
      if(session) {
        // refresh session
        ipCookie(sessionKey, session, {
          expires: 120,
          expirationUnit: 'minutes',
          secure: true
        });
        self.keyType = keyTypes.EXISTING;
      }
      if(!session) {
        // session was not found in cookies, try sessionStorage
        try {
          session = JSON.parse(sessionStorage.getItem(sessionKey));
          self.keyType = keyTypes.TEMPORARY;
        } catch(err) {
          console.log('Error: Failed to parse existing session data.');
        }
      }
      // extract the keyInfo if it exists in the session
      self.keyInfo = session.publicKey;
      _navigateToIdp({session: session, owner: identity.owner});
    } catch(e) {
      identity.selected = true;
      self.identitySelected = true;
    }
  };

  /**
   * Perform a login and redirect the browser if the login is
   * successful.
   *
   * @param username the username to use when logging in.
   * @param password the password to use when logging in.
   */
  self.login = function(options) {
    var username = null;
    var sessionKey = null;
    if(options.identity && typeof options.identity === 'object') {
      username = options.identity.label;
      self.keyInfo = options.identity;
      self.keyType = keyTypes.EXISTING;
    } else {
      username = options.username;
      if(options.remember) {
        self.keyType = keyTypes.NEW;
      } else {
        self.keyType = keyTypes.TEMPORARY;
      }
    }
    var hash = didio.generateHash(username, options.password);
    var privateKey = null;

    // decrypt the encrypted key, if it exists
    if(self.keyInfo && self.keyInfo.privateKeyPem) {
      privateKey = pki.decryptRsaPrivateKey(
        self.keyInfo.privateKeyPem, username + options.password);
    }
    // fetch the username + passphrase mapping
    var did = null;
    Promise.resolve($http.get('/mappings/' + hash))
      .then(function(response) {
        // the mapping fetch succeeded
        if(response.data && response.data.did) {
          did = response.data.did;
          sessionKey = _encodeSessionKey(did);
        } else {
          throw new Error('DID lookup failed');
        }
        return self._generateTemporaryKey(hash);
      }).then(function(key) {
        if(self.publicComputer) {
          self.keyInfo = key;
          privateKey = pki.privateKeyFromPem(self.keyInfo.privateKeyPem);
        }

        // get the DID document
        return Promise.resolve($http.get('/dids/' + did));
      }).then(function(response) {
        // fetched the person's DID document
        var didDocument = response.data;
        return Promise.resolve($http.get('/dids/' + didDocument.idp));
      }).then(function(response) {
        // fetched the person's IdP DID document
        var idpDidDocument = response.data;
        // TODO: remove this backwards-compatibility hack, only fetch
        // idpDidDocument.url in the future
        if('credentialRequestUrl' in idpDidDocument &&
          'storageRequestUrl' in idpDidDocument) {
          return Promise.resolve(idpDidDocument);
        }

        // get the IdP's service end points
        // TODO: hit `url` directly with JSON-LD request instead of using
        // .well-known
        var url = idpDidDocument.url + '/.well-known/identity';
        return Promise.resolve($http.get(url));
      }).then(function(response) {
        var idpConfig = response.data;

        // fetched IdP's service config
        // extract the IdP DID credential request URL
        // FIXME: security issue - do not store the public key information
        // in a cookie since the private key is sent unencrypted to/from
        // authorization.io
        var sessionData = {
          did: did,
          publicKey: {
            id: self.keyInfo.id,
            owner: self.keyInfo.owner,
            publicKeyPem: self.keyInfo.publicKeyPem,
            privateKeyPem: pki.privateKeyToPem(privateKey)
          },
          credentialRequestUrl: idpConfig.credentialsRequestUrl,
          storageRequestUrl: idpConfig.storageRequestUrl
        };
        if(self.keyType === keyTypes.EXISTING) {
          ipCookie(sessionKey, sessionData, {
            expires: 120,
            expirationUnit: 'minutes',
            secure: true
          });
        }
        if(self.keyType !== keyTypes.EXISTING) {
          // TODO: should we delete a temporary key entirely once we sign with
          // it or let it persist for the whole session?
          sessionStorage.setItem(sessionKey, JSON.stringify(sessionData));
        }
        return {session: sessionData, owner: did};
      }).then(_navigateToIdp)
      .catch(function(err) {
        brAlertService.add('error', 'Unable to log in.');
        console.log(err);
      }).then(function() {
        $scope.$apply();
      });
  };

  self.showAll = function(identity, loginForm) {
    identity.selected = false;
    self.identitySelected = false;
    loginForm.password.$setUntouched();
    loginForm.$setPristine();
  };

  function _navigateToIdp(options) {
    var session = options.session;
    var id = uuid.v4();
    var authioCallback =
      config.data.baseUri + '/credentials?id=' + id;
    var credentialCallback = $location.search().credentialCallback;
    var storageCallback = $location.search().storageCallback;
    var credentialRequest = {};
    var publicKeyType = ['CryptographicKey'];

    if(self.keyType !== keyTypes.EXISTING) {
      publicKeyType.push('EphemeralCryptographicKey');
    }

    if(credentialCallback && !config.data.sendCryptographicKeyCredential) {
      sessionStorage.setItem(
        id,
        JSON.stringify({
          callback: credentialCallback,
          owner: options.owner,
          keyType: self.keyType
        }));

      credentialRequest.query = config.data.credentialRequest;

      // add the public key for the request (if one exists)
      if(self.keyInfo.publicKeyPem) {
        credentialRequest.publicKey = {
          publicKeyPem: self.keyInfo.publicKeyPem,
          type: publicKeyType,
          owner: options.owner
        };
        if(self.keyInfo.id) {
          credentialRequest.publicKey.id = self.keyInfo.id;
        }
      }

      navigator.credentials.request(credentialRequest, {
        requestUrl: session.credentialRequestUrl,
        credentialCallback: authioCallback
      });
    } else if(credentialCallback &&
        config.data.sendCryptographicKeyCredential) {
      // clone template
      var identity = JSON.parse(JSON.stringify(
        config.data.identityWithCryptographicKeyCredentialTemplate));
      identity.id = session.did;
      identity.signature.creator = session.publicKey.id;
      var credential = identity.credential[0]['@graph'];
      credential.claim = {
        id: session.did,
        publicKey: {
          id: session.publicKey.id,
          publicKeyPem: session.publicKey.publicKeyPem,
          owner: session.publicKey.owner
        }
      };
      credential.signature.creator = session.publicKey.id;

      navigator.credentials.transmit(
        identity, {responseUrl: credentialCallback});
    } else if(storageCallback) {
      sessionStorage.setItem(
        id, JSON.stringify({
          callback: storageCallback,
          owner: options.owner,
          keyType: self.keyType
        }));
      navigator.credentials.store(
        config.data.storageRequest,
        {requestUrl: session.storageRequestUrl, storageCallback: authioCallback}
      );
    }
  }

  function _display(showProperty) {
    for(var propertyName in self.display) {
      self.display[propertyName] = false;
    }
    self.display[showProperty] = true;
  }

  function _encodeSessionKey(key) {
    // NOTE: stripping colon because browser encodes it
    return [key.replace(/[:]/g,''), 'session'].join('.');
  }

  function _getOwnerId(identity) {
    return identity.credential[0]['@graph'].claim.id;
  }
}

return {RequestController: factory};

});
