define([
  'angular',
  'async',
  'did-io',
  'forge',
  'jsonld',
  'jsonld-signatures',
  'node-uuid'],
  function(angular, async, didio, forge, jsonld, jsigs, uuid) {

'use strict';

/* @ngInject */
function factory($http) {
  var service = {};

  var STORAGE_KEYS = {
    IDENTITIES: 'authio.identities',
    AUTHENTICATED: 'authio.authenticated',
    SESSION: 'authio.session'
  };
  // TODO: make configurable (30 mins)
  var SESSION_EXPIRATION = 30 * 60 * 1000;

  // initialize libs using the AMD-loaded helper libraries
  jsigs = jsigs();
  jsigs.use('async', async);
  jsigs.use('forge', forge);
  jsigs.use('jsonld', jsonld);
  didio = didio();
  didio.use('forge', forge);
  didio.use('jsonld', jsonld);
  didio.use('uuid', uuid);

  /* Note: This service presently assumes locally-stored identities have at
  most one local key pair. Users that want to use more than one local
  key pair will not be able to do so. */

  /**
   * Registers a new identity. This call will register a new decentralized
   * identifier and create a hash(identifier + password) mapping to it.
   *
   * @param options the options to use:
   *          identifier the identifier to use.
   *          password the password to use.
   *          idp the DID for the IdP to use.
   *          [scope] a scope to emit progress events with; the events
   *            emitted will be: `identityService.register.progress`
   *              with an object `{secondsLeft: <value>}`.
   *
   * @return a Promise that resolves to an object containing the new identity
   *    and its DID document: `{identity: ..., didDocument: ...}`.
   */
  service.register = function(options) {
    options = options || {};
    if(!options.identifier || typeof options.identifier !== 'string') {
      throw new Error('options.identifier must be a non-empty string.');
    }
    if(!options.password || typeof options.identifier !== 'string') {
      throw new Error('options.password must be a non-empty string.');
    }
    // TODO: support `https` identifiers for IdPs
    if(!options.idp || typeof options.idp !== 'string' ||
      options.idp.indexOf('did:') !== 0) {
      throw new Error('options.idp must be a valid DID.');
    }

    return _generateKeyPair().then(function(kp) {
      var did = didio.generateDid();
      var identity = _createIdentity({
        did: did,
        keypair: kp,
        publicKeyId: did + '/keys/1',
        identifier: options.identifier,
        password: options.password
      });
      return _registerIdentity({
        identity: identity,
        idp: options.idp,
        password: options.password,
        privateKeyPem: forge.pki.privateKeyToPem(kp.privateKey),
        scope: options.scope
      });
    }).then(function(registrationInfo) {
      // permanently store identity
      storage.insert({
        identity: registrationInfo.identity,
        permanent: true
      });
      return registrationInfo;
    });
  };

  /**
   * Loads an identity. The identity will be loaded into session storage. It
   * can be promoted to permanent storage later if requested.
   *
   * @param options the options to use:
   *          [identifier] the identifier to use.
   *          [password] the password to use.
   *          [temporary] true to load the identity only temporarily; note
   *            this will be ignored if the identity is already permanent.
   *
   * @return a Promise that resolves to the new identity.
   */
  service.load = function(options) {
    options = options || {};
    if(!options.identifier || typeof options.identifier !== 'string') {
      throw new Error('options.identifier must be a non-empty string.');
    }
    if(!options.password || typeof options.identifier !== 'string') {
      throw new Error('options.password must be a non-empty string.');
    }

    // fetch the hash(identifier + passphrase) mapping
    var hash = didio.generateHash(options.identifier, options.password);
    var url = '/mappings/' + hash;
    return Promise.resolve($http.get(url)).then(function(response) {
      if(!(response.data && response.data.did)) {
        throw new Error('DID lookup failed.');
      }
      return response.data.did;
    }).then(function(did) {
      // check locally-stored identities
      var identity = storage.get(did);
      if(identity) {
        var password = _getKeyPassword(options.identifier, options.password);
        var privateKey;
        try {
          privateKey = forge.pki.decryptRsaPrivateKey(
            identity.publicKey.privateKeyPem, password);
        } catch(err) {}
        if(!privateKey) {
          throw new Error('Invalid password.');
        }
        return identity;
      }

      // generate keypair for temporary identity
      return _generateKeyPair().then(function(kp) {
        var opts = {
          did: did,
          keypair: kp,
          identifier: options.identifier,
          password: options.password
        };
        if('temporary' in options) {
          opts.temporary = options.temporary;
          if(opts.temporary) {
            // generate a sha-256 public key fingerprint for the key ID
            var fingerprint = forge.pki.getPublicKeyFingerprint(
              kp.publicKey, {
                md: forge.md.sha256.create(),
                encoding: 'hex',
                delimiter: ':'
              });
            opts.publicKeyId = 'urn:rsa-public-key-sha256:' + fingerprint;
          }
        }
        var identity = _createIdentity(opts);
        return storage.insert({
          identity: identity,
          permanent: false
        });
      });
    });
  };

  /**
   * Authenticates as an identity. Unlocking an identity removes the need to
   * enter a password for a particular identity. Authentication can only be
   * performed on identities that have already been loaded via `load()`.
   *
   * @param id the ID (DID) for the identity.
   * @param password the identity's password.
   */
  service.authenticate = function(id, password) {
    var identity = storage.get(id);
    if(!identity) {
      throw new Error('Identity not found.');
    }

    password = _getKeyPassword(identity.label, password);
    var privateKey;
    try {
      privateKey = forge.pki.decryptRsaPrivateKey(
        identity.publicKey.privateKeyPem, password);
    } catch(err) {}
    if(!privateKey) {
      throw new Error('Invalid password.');
    }

    // save decrypted private key
    // use `localStorage` because authenticated identities need to persist
    // across different windows
    var authenticated = localStorage.getItem(STORAGE_KEYS.AUTHENTICATED);
    if(!authenticated) {
      authenticated = {};
    } else {
      try {
        authenticated = JSON.parse(authenticated);
      } catch(err) {
        authenticated = {};
      }
    }
    // to prevent authenticated identities from getting out-of-sync with
    // permanent storage, merge all identity information
    identity.privateKeyPem = forge.pki.privateKeyToPem(privateKey);
    identity.expires = Date.now() + SESSION_EXPIRATION;
    authenticated[id] = identity;
    localStorage.setItem(
      STORAGE_KEYS.AUTHENTICATED, JSON.stringify(authenticated));
  };

  /**
   * Gets an authenticated identity.
   *
   * @param id the ID (DID) of the identity to get.
   *
   * @return the authenticated identity or null.
   */
  service.getAuthenticated = function(id) {
    var rval = null;

    var authenticated = localStorage.getItem(STORAGE_KEYS.AUTHENTICATED);
    if(!authenticated) {
      authenticated = {};
    } else {
      try {
        authenticated = JSON.parse(authenticated);
      } catch(err) {
        authenticated = {};
      }
    }
    if(id in authenticated) {
      // ensure identity hasn't expired and is loaded
      if(authenticated[id].expires < Date.now() || !storage.get(id)) {
        // expire authenticated identity
        delete authenticated[id];
      } else {
        // update authenticated identity
        rval = authenticated[id];
        rval.expires = Date.now() + SESSION_EXPIRATION;
      }
      localStorage.setItem(
        STORAGE_KEYS.AUTHENTICATED, JSON.stringify(authenticated));
    }
    return rval;
  };

  /**
   * Checks whether or not the identity associated with the given DID is
   * authenticated.
   *
   * @param id the ID (DID) of the identity to check.
   *
   * @return true if the identity is authenticated, false if not.
   */
  service.isAuthenticated = function(id) {
    return !!service.getAuthenticated(id);
  };

  /**
   * Creates a session for an authenticated identity. Creating a session
   * establishes which identity should be used in credential flows. Only
   * one session can be set at a time. A sessions can only be set for an
   * identity that has been authenticated.
   *
   * @param id the ID (DID) for the identity.
   *
   * @return a Promise that resolves to the created session.
   */
  service.createSession = function(id) {
    var authenticated = service.getAuthenticated(id);
    if(!authenticated) {
      return Promise.reject(new Error('Not authenticated.'));
    }

    // check identity's IdP's config
    return service.getIdPConfig(id).then(function(config) {
      // merge authenticated identity information into session to prevent
      // session from getting out-of-sync
      var session = authenticated;
      session.idpConfig = config;
      // use `localStorage` because the session needs to persist across
      // multiple windows
      localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
      return session;
    });
  };

  /**
   * Gets the current session, if one exists.
   *
   * @return the session, null if none exists.
   */
  service.getSession = function() {
    var session = localStorage.getItem(STORAGE_KEYS.SESSION);
    if(!session) {
      return null;
    }
    try {
      session = JSON.parse(session);
    } catch(err) {
      return null;
    }
    if(!service.isAuthenticated(session.id)) {
      return null;
    }
    return session;
  };

  /**
   * Gets the service end point configuration for an identity's IdP.
   *
   * @param id the identity's ID (DID).
   *
   * @return a Promise that resolves to the IdP's config.
   */
  service.getIdPConfig = function(id) {
    // get user's DID document
    return Promise.resolve($http.get('/dids/' + id)).then(function(response) {
      // get IdP's DID document
      var didDocument = response.data;
      return Promise.resolve($http.get('/dids/' + didDocument.idp));
    }).then(function(response) {
      var idpDidDocument = response.data;
      // get the IdP's config
      // TODO: hit `url` directly with JSON-LD request instead of using
      // .well-known
      var url = idpDidDocument.url + '/.well-known/identity';
      return Promise.resolve($http.get(url));
    }).then(function(response) {
      return response.data;
    });
  };

  /**
   * Digitally signs a document.
   *
   * @param options the options to use:
   *          document the document to sign.
   *          publicKeyId the ID of the public key.
   *          privateKeyPem the unencrypted private key PEM to use.
   *          [domain] the domain to use.
   *
   * @return a Promise that resolves to the signed document.
   */
  service.sign = function(options) {
    var opts = {
      algorithm: 'LinkedDataSignature2015',
      privateKeyPem: options.privateKeyPem,
      creator: options.publicKeyId
    };
    if('domain' in options) {
      opts.domain = options.domain;
    }
    return new Promise(function(resolve, reject) {
      jsigs.sign(options.document, opts, function(err, signed) {
        if(err) {
          return reject(err);
        }
        resolve(signed);
      });
    });
  };

  var storage = service.identities = {};

  /**
   * Inserts an identity into storage.
   *
   * @param options the options to use:
   *          identity the identity to insert.
   *          [permanent] true to only get a permanent identity, false to only
   *            get a session-only identity.
   *
   * @param id the ID (DID) of the identity to look for.
   *
   * @return the identity if found, null if not.
   */
  storage.insert = function(options) {
    options = options || {};
    if(!options.identity || typeof options.identity !== 'object') {
      throw new Error('options.identity must be a valid object.');
    }
    if(!('permanent' in options)) {
      throw new Error('options.permanent must be a boolean.');
    }
    var identities = storage.getAll(options);
    identities[options.identity.id] = options.identity;
    var db = options.permanent ? localStorage : sessionStorage;
    db.setItem(STORAGE_KEYS.IDENTITIES, JSON.stringify(identities));
    return options.identity;
  };

  /**
   * Gets a locally-stored identity by ID (DID).
   *
   * @param id the ID (DID) of the identity to look for.
   * @param [options] the options to use:
   *          [permanent] true to only get a permanent identity, false to only
   *            get a session-only identity.
   *
   * @return the identity if found, null if not.
   */
  storage.get = function(id, options) {
    options = options || {};
    if(!id || typeof id !== 'string') {
      throw new Error('options.id must be a non-empty string.');
    }
    if(!('permanent' in options)) {
      // check local, then session
      return storage.get(id, {permanent: true}) ||
        storage.get(id, {permanent: false});
    }
    return storage.getAll(options)[id] || null;
  };

  /**
   * Gets all available identities.
   *
   * @param options the options to use.
   *          [permanent] true to get only permanent identities, false to
   *            get only session-only identities.
   *
   * @return all available identities.
   */
  storage.getAll = function(options) {
    options = options || {};
    if(!('permanent' in options)) {
      // merge permanent identities over session-only ones
      return angular.extend(
        {}, storage.getAll({permanent: false}),
        storage.getAll({permanent: true}));
    }
    var identities;
    var db = options.permanent ? localStorage : sessionStorage;
    identities = db.getItem(STORAGE_KEYS.IDENTITIES);
    if(identities) {
      try {
        identities = JSON.parse(identities);
      } catch(err) {
        console.error('Could not parse locally-stored identities.');
        // TODO: wiping out identities when they can't be parsed could be
        // very problematic, perhaps best to leave them alone any establish
        // new storage instead
        identities = {};
      }
    } else {
      identities = {};
    }
    return identities;
  };

  /**
   * Registers a new decentralized identity and hash mapping for its DID.
   *
   * @param options the options to use:
   *          identity the identity to create.
   *          idp the DID for the identity's IdP.
   *          privateKeyPem the private key PEM for the identity.
   *          [scope] a scope to emit progress events with.
   *
   * @return a Promise that resolves to an object containing the new identity
   *    and its DID document: `{identity: ..., didDocument: ...}`.
   */
  function _registerIdentity(options) {
    // create signed DID document
    var did = options.identity.id;
    var didDocument = {
      '@context': 'https://w3id.org/identity/v1',
      id: did,
      idp: options.idp,
      accessControl: {
        writePermission: [{
          id: options.identity.publicKey.id,
          type: options.identity.publicKey.type
        }, {
          id: options.idp,
          type: 'Identity'
        }]
      },
      publicKey: [{
        id: options.identity.publicKey.id,
        type: options.identity.publicKey.type,
        owner: did,
        publicKeyPem: options.identity.publicKey.publicKeyPem
      }]
    };
    return service.sign({
      document: didDocument,
      publicKeyId: options.identity.publicKey.id,
      privateKeyPem: options.privateKeyPem
    }).then(function(signed) {
      didDocument = signed;
      return _establishProofOfPatience(didDocument, options.scope);
    }).then(function(proof) {
      // use the proof of patience to register the DID
      return Promise.resolve($http.post('/dids/', didDocument, {
        headers: {
          authorization: proof
        }
      }));
    }).then(function(response) {
      if(response.status !== 201) {
        throw response;
      }
      // create signed mapping from the hash to the DID
      var mapping = {
        '@context': 'https://w3id.org/identity/v1',
        id: didio.generateHash(options.identity.label, options.password),
        did: did,
        accessControl: {
          writePermission: [{
            id: options.identity.publicKey.id,
            type: options.identity.publicKey.type
          }]
        }
      };
      return service.sign({
        document: mapping,
        publicKeyId: options.identity.publicKey.id,
        privateKeyPem: options.privateKeyPem
      });
    }).then(function(signed) {
      // register mapping
      return Promise.resolve($http.post('/mappings', signed));
    }).then(function(response) {
      if(response.status !== 201) {
        throw response;
      }
      return {
        identity: options.identity,
        didDocument: didDocument
      };
    });
  }

  /**
   * Creates an identity object from the given options.
   *
   * @param options the options to use:
   *          did the DID for the identity.
   *          identifier the local identifier for the identity.
   *          [publicKeyId] an identifier for the identity's public key.
   *          [keypair] a new keypair for the identity.
   *          [temporary] true to create a temporary identity.
   *          [password] the password for the identity.
   *
   * @return the created identity object.
   */
  function _createIdentity(options) {
    var identity = {
      '@context': 'https://w3id.org/identity/v1',
      id: options.did,
      label: options.identifier,
      publicKey: {}
    };
    if(options.publicKeyId) {
      identity.publicKey.id = options.publicKeyId;
    }
    identity.publicKey.type = (options.temporary ?
      ['EphemeralCryptographicKey', 'CryptographicKey'] : 'CryptographicKey');
    identity.publicKey.owner = options.did;
    identity.publicKey.publicKeyPem = forge.pki.publicKeyToPem(
      options.keypair.publicKey);
    identity.publicKey.privateKeyPem = forge.pki.encryptRsaPrivateKey(
      options.keypair.privateKey,
      _getKeyPassword(options.identifier, options.password));
    return identity;
  }

  /**
   * Gets the password to use for private key encryption/decryption.
   *
   * @param identifier the identifier to use.
   * @param password the password for the identifier.
   *
   * @return the password for the key.
   */
  function _getKeyPassword(identifier, password) {
    // reuse `didio.generateHash` but do not use the same hash as the
    // public mapping by duplicating password
    return didio.generateHash(identifier, password + password);
  }

  /**
   * Asynchronously generates a key pair.
   *
   * @return a Promise that resolves to a key pair.
   */
  function _generateKeyPair() {
    return new Promise(function(resolve, reject) {
      forge.pki.rsa.generateKeyPair({
        // TODO: change to config value
        bits: 2048,
        workerScript: '/bower-components/forge/js/prime.worker.js'
      }, function(err, keypair) {
        if(err) {
          return reject(err);
        }
        return resolve(keypair);
      });
    });
  }

  /**
   * Establishes a proof of patience for writing a DID document.
   *
   * @param didDocument the DID document.
   * @param [scope] optional scope to emit progress events with.
   *
   * @return a Promise that resolves to the proof to use to authorize.
   */
  function _establishProofOfPatience(didDocument, scope) {
    return new Promise(function(resolve, reject) {
      return Promise.resolve($http.post('/dids/', didDocument, {
        transformResponse: function(data, headers, status) {
          return {
            status: status,
            headers: {
              'retry-after': parseInt(headers('retry-after'), 10),
              'www-authenticate': headers('www-authenticate')
            },
            data: data
          };
        }})).then(function(response) {
          // expecting a 401 HTTP error code, so a success of any kind is bad
          return reject(response);
        }).catch(function(err) {
          // expect 401 unauthorized and a proof-of-patience challenge
          if(err.status !== 401) {
            return reject(err);
          }

          // wait for as long as the proof of patience requires
          var secondsLeft = err.headers['retry-after'];
          var proof = err.headers['www-authenticate'];
          if(scope) {
            scope.$emit('identityService.register.progress', {
              secondsLeft: secondsLeft
            });
          }
          var waitTime = secondsLeft * 1000;
          setTimeout(function() {
            return resolve(proof);
          }, waitTime);
        });
    });
  }

  return service;
}

return {aioIdentityService: factory};

});
