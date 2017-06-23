/*!
 * New BSD License (3-clause)
 * Copyright (c) 2015-2017, Digital Bazaar, Inc.
 * Copyright (c) 2015-2017, Accreditrust Technologies, LLC
 * All rights reserved.
 */
import angular from 'angular';
import async from 'async';
import Didio from 'did-io';
import forge from 'node-forge';
import jsonld from 'jsonld';
import Jsigs from 'jsonld-signatures';
import uuid from 'uuid/v4';

// FIXME: this is a temporarty patch because did-io is expecting v4 function
uuid.v4 = () => uuid();

/* @ngInject */
export default function factory($http) {
  var service = {};

  var STORAGE_KEYS = {
    IDENTITIES: 'authio.identities',
    AUTHENTICATED: 'authio.authenticated',
    SESSION: 'authio.session'
  };
  // TODO: make configurable (30 mins)
  var SESSION_EXPIRATION = 30 * 60 * 1000;

  // initialize libs using the AMD-loaded helper libraries
  const jsigs = Jsigs();
  jsigs.use('async', async);
  jsigs.use('forge', forge);
  jsigs.use('jsonld', jsonld);
  const didio = Didio();
  didio.use('forge', forge);
  didio.use('jsonld', jsonld);
  didio.use('uuid', uuid);

  /* Note: This service presently assumes locally-stored identities have at
  most one local key pair. Users that want to use more than one local
  key pair will not be able to do so. */

  /**
   * Registers a new identity. This call will register a new decentralized
   * identifier and create a hash(identifier + password) mapping to it if
   * a password is provided.
   *
   * @param options the options to use:
   *          identifier the human-readable identifier to use.
   *          idp the DID for the IdP to use.
   *          repositoryOrigin the origin of the repository.
   *          [id] the DID to use, `undefined` to generate one.
   *          [password] the password to use, if encrypting, and to
   *            create mapping.
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
      throw new TypeError('options.identifier must be a non-empty string.');
    }
    if('password' in options && typeof options.password !== 'string') {
      throw new TypeError('options.password must be a non-empty string.');
    }
    // TODO: support `https` identifiers for IdPs
    if(!options.idp || typeof options.idp !== 'string' ||
      options.idp.indexOf('did:') !== 0) {
      throw new TypeError('options.idp must be a valid DID.');
    }
    if('id' in options && (typeof options.idp !== 'string' ||
      options.id.indexOf('did:') !== 0)) {
      throw new TypeError('options.id must be a valid DID.');
    }
    return _generateKeyPair().then(function(kp) {
      if('id' in options) {
        // `id` given, delegate registration
        return _delegateRegistration({
          id: options.id,
          repositoryOrigin: options.repositoryOrigin,
          publicKeyPem: forge.pki.publicKeyToPem(kp.publicKey)
        }).then(function(registrationInfo) {
          // ensure identity information is uniform
          registrationInfo.identity = _createIdentity({
            id: registrationInfo.identity.id,
            keypair: kp,
            publicKeyId: registrationInfo.identity.publicKey.id,
            label: options.identifier,
            password: 'password' in options ? options.password : undefined
          });
          return registrationInfo;
        });
      }

      // generate new `did`; handle registration directly
      var did = didio.generateDid();
      var identity = _createIdentity({
        id: did,
        keypair: kp,
        publicKeyId: did + '/keys/1',
        label: options.identifier,
        password: 'password' in options ? options.password : undefined
      });
      return _registerIdentity({
        identity: identity,
        idp: options.idp,
        password: 'password' in options ? options.password : undefined,
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
   * Loads an existing identity that may not be stored on the local device yet.
   *
   * If `temporary` is set to true, then loading this identity on this device
   * will be considered temporary. This means that any key pair generated for
   * the identity will not be marked for future permanent registration with
   * the WebDHT. This setting is typically used for public devices.
   *
   * If `create` is true and the identity is not already stored on the local
   * device, it and a new key pair will be created and stored in session
   * storage. It can be promoted to permanent storage later if requested,
   * provided that `temporary` is not also set.
   *
   * @param options the options to use:
   *          identifier the identifier to use.
   *          [password] the password to use.
   *          [repo] the credential repo that must match.
   *          [temporary] true to indicate that loading the identity on the
   *            local device is temporary
   *          [create] true to create the identity if it doesn't exist
   *
   * @return a Promise that resolves to the loaded identity.
   */
  service.load = function(options) {
    options = options || {};
    if(!options.identifier || typeof options.identifier !== 'string') {
      throw new TypeError('options.identifier must be a non-empty string.');
    }
    if('password' in options && typeof options.password !== 'string') {
      throw new TypeError('options.password must be a non-empty string.');
    }
    if('repo' in options && typeof options.repo !== 'string') {
      throw new TypeError('options.repo must be a string.');
    }

    var getIdentity;
    if(!('password' in options)) {
      getIdentity = Promise.resolve(
        storage.getByLabel(options.identifier, options));
    } else {
      // fetch the hash(identifier + passphrase) mapping
      var hash = didio.generateHash(options.identifier, options.password);
      var url = '/mappings/' + hash;
      getIdentity = Promise.resolve($http.get(url)).then(function(response) {
        if(!(response.data && response.data.url)) {
          throw new Error('Decentralized identifier lookup failed.');
        }
        // TODO: support more than one DID result for a given hash
        // by showing possible DID choices, their created time, and their
        // associated credential repos
        var did = jsonld.getValues(response.data, 'url')[0];
        return did;
      }).then(function(did) {
        // return locally-stored identity if available
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
        // generate keypair for identity that isn't yet locally-stored
        return _generateKeyPair().then(function(kp) {
          var opts = {
            id: did,
            keypair: kp,
            label: options.identifier,
            password: options.password
          };
          if('temporary' in options) {
            opts.temporary = options.temporary;
          }
          var identity = _createIdentity(opts);
          return storage.insert({
            identity: identity,
            permanent: false
          });
        });
      });
    }

    return getIdentity.then(function(identity) {
      if(!Array.isArray(identity)) {
        identity = [identity];
      }
      if(!('repo' in options)) {
        return identity;
      }
      // filter identities by `repo`
      return Promise.all(identity.map(function(next) {
        return service.getDidDocument(next.id);
      })).then(function(ddos) {
        return identity.filter(function(next, idx) {
          return ddos[idx].idp === options.repo;
        });
      });
    }).then(function(identities) {
      if((identities.length === 0 || !identities[0]) && !options.create) {
        throw new Error('Identity not found.');
      }
      return identities[0] || null;
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
   * A `cache` object can be provided to this call to optimize getting many
   * identities in rapid succession. If a cache object is used, then session
   * expiration updates will not be persisted and no sanity check will be
   * made to ensure an authenticated identity hasn't been deleted.
   *
   * @param id the ID (DID) of the identity to get.
   * @param [options] the options to use.
   *          [cache] a cache to use to store authenticated identities; pass
   *            an empty object and it will be populated for reuse, this is
   *            useful for getting multiple identities in rapid succession).
   *
   * @return the authenticated identity or null.
   */
  service.getAuthenticated = function(id, options) {
    options = options || {};
    var cached = false;
    if('cache' in options) {
      cached = true;
    }
    var cache = options.cache || {};

    if(!cache.authenticated) {
      cache.authenticated = localStorage.getItem(STORAGE_KEYS.AUTHENTICATED);
      if(!cache.authenticated) {
        cache.authenticated = {};
      } else {
        try {
          cache.authenticated = JSON.parse(cache.authenticated);
        } catch(err) {
          cache.authenticated = {};
        }
      }
    }

    var authenticated = cache.authenticated;
    var identity;
    if(!(id in authenticated)) {
      if(cached) {
        if(!cache.identities) {
          cache.identities = storage.getAll();
        }
        identity = cache.identities[id];
      } else {
        identity = storage.get(id);
      }
      if(!identity) {
        return null;
      }
      var pem = identity.publicKey.privateKeyPem;
      if(typeof pem === 'string' &&
        pem.indexOf('-----BEGIN ENCRYPTED') === -1) {
        // TODO: other code requires `privateKeyPem` to be on authenticated
        // identity which is strange; move to `identity.publicKey.privateKeyPem`
        // if possible and remove this extra copy of the data here
        identity.privateKeyPem = pem;
        identity.expires = Date.now() + SESSION_EXPIRATION;
        authenticated[id] = identity;
        return identity;
      }
      return null;
    }
    // ensure identity hasn't expired and is loaded; skip storage check
    // when using cache as a fuzzy optimization
    if(authenticated[id].expires < Date.now() ||
      (!cached && !storage.get(id))) {
      // expire authenticated identity
      delete authenticated[id];
      identity = null;
    } else {
      // update authenticated identity
      identity = authenticated[id];
      identity.expires = Date.now() + SESSION_EXPIRATION;
    }
    // do not write update when using cache
    if(!cached) {
      localStorage.setItem(
        STORAGE_KEYS.AUTHENTICATED, JSON.stringify(authenticated));
    }
    return identity;
  };

  /**
   * Checks whether or not the identity associated with the given DID is
   * authenticated.
   *
   * @param id the ID (DID) of the identity to check.
   * @param [options] the options to use.
   *          [cache] a cache to use to store authenticated identities; pass
   *            an empty object and it will be populated for reuse, this is
   *            useful for checking multiple identities in rapid succession).
   *
   * @return true if the identity is authenticated, false if not.
   */
  service.isAuthenticated = function(id, options) {
    return !!service.getAuthenticated(id, options);
  };

  /**
   * Makes a temporary identity permanent.
   *
   * @param id the ID (DID) of the identity to make permanent.
   * @param publicKeyId the new ID for the identity's public key.
   */
  service.makePermanent = function(id, publicKeyId, options) {
    options = options || {};
    if(!id || typeof id !== 'string') {
      throw new Error('id must be a non-empty string.');
    }
    if(!publicKeyId || typeof publicKeyId !== 'string') {
      throw new Error('publicKeyId must be a non-empty string.');
    }

    // update session storage
    var identities = storage.getAll({permanent: false});
    if(id in identities) {
      var identity = identities[id];
      delete identity.sysRegisterKey;
      identity.publicKey.id = publicKeyId;
      sessionStorage.setItem(
        STORAGE_KEYS.IDENTITIES, JSON.stringify(identities));

      // update permanent public key ID
      identities = storage.getAll({permanent: true});
      identities[id] = identity;
      localStorage.setItem(STORAGE_KEYS.IDENTITIES, JSON.stringify(identities));
    }

    // update authenticated storage
    var authenticated = localStorage.getItem(STORAGE_KEYS.AUTHENTICATED);
    if(authenticated) {
      try {
        authenticated = JSON.parse(authenticated);
      } catch(err) {
        authenticated = {};
      }
    }
    if(authenticated && id in authenticated) {
      // ensure identity hasn't expired and is loaded
      if(authenticated[id].expires < Date.now() || !storage.get(id)) {
        // expire authenticated identity
        delete authenticated[id];
      } else {
        // update authenticated identity
        authenticated[id].expires = Date.now() + SESSION_EXPIRATION;
        delete authenticated[id].sysRegisterKey;
        authenticated[id].publicKey.id = publicKeyId;
      }
      localStorage.setItem(
        STORAGE_KEYS.AUTHENTICATED, JSON.stringify(authenticated));
    }

    // update session
    var session = service.getSession();
    if(session && session.id === id) {
      session.publicKey.id = publicKeyId;
      sessionStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
    }
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
      sessionStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
      return session;
    });
  };

  /**
   * Gets the current session, if one exists.
   *
   * @return the session, null if none exists.
   */
  service.getSession = function() {
    var session = sessionStorage.getItem(STORAGE_KEYS.SESSION);
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
   * Clears the current session, if one exists.
   */
  service.clearSession = function() {
    sessionStorage.removeItem(STORAGE_KEYS.SESSION);
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
    return service.getDidDocument(id).then(function(didDocument) {
      // FIXME: don't assume IdP uses a DID, may use HTTPS
      // get IdP's DID document
      return service.getDidDocument(didDocument.idp);
    }).then(function(idpDidDocument) {
      // get the IdP's config
      // TODO: hit `url` directly with JSON-LD request instead of using
      // .well-known
      var url = idpDidDocument.url + '/.well-known/identity';
      return Promise.resolve($http.get(url)).catch(function(err) {
        throw new Error(
          'Could not communicate with "' + idpDidDocument.url + '".');
      });
    }).then(function(response) {
      return response.data;
    });
  };

  /**
   * Gets an identity's DID document.
   *
   * @param id the identity's ID (DID).
   *
   * @return a Promise that resolves to the identity's DID document.
   */
  service.getDidDocument = function(id) {
    return Promise.resolve($http.get('/dids/' + id)).then(function(response) {
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
      throw new Error('id must be a non-empty string.');
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
   * Gets an identity by label. More than one identity will be returned if the
   * label is not unique.
   *
   * @param label the local identifier (e.g. email) for the identity.
   * @param options the options to use.
   *          [permanent] true to get only permanent identities, false to
   *            get only session-only identities.
   *
   * @return the identity if found, null if not.
   */
  storage.getByLabel = function(label, options) {
    var rval = null;
    var identities = storage.getAll(options);
    for(var id in identities) {
      if(identities[id].label === label) {
        if(!rval) {
          rval = identities[id];
        } else if(Array.isArray(rval)) {
          rval.push(identities[id]);
        } else {
          rval = [rval, identities[id]];
        }
      }
    }
    return rval;
  };

  /**
   * Delegate registration to a repository's event handler.
   *
   * @param options the options to use:
   *          [id] the ID of the DID to register.
   *          [repositoryOrigin] the origin of the repository to delegate to.
   *          [publicKeyPem] the PEM for the public key that was generated.
   *
   * @return a Promise that resolves to the registrationInfo when registration
   *           has completed.
   */
  function _delegateRegistration(options) {
    var router = new navigator.credentials._Router(options.repositoryOrigin);
    router.emit('registerIdentityCredential', {
      publicKey: {
        '@context': 'https://w3id.org/identity/v1',
        type: 'CryptographicKey',
        owner: options.id,
        publicKeyPem: options.publicKeyPem
      }
    });
    return router.receive('continue').then(function(message) {
      var identity = message.data;
      if(!identity) {
        throw new Error('Registration canceled.');
      }
      // TODO: validate `identity`
      return service.getDidDocument(identity.id).then(function(ddo) {
        return {
          identity: identity,
          didDocument: ddo
        };
      });
    });
  }

  /**
   * Registers a new decentralized identity and, if a password is given,
   * a hash mapping for its DID.
   *
   * @param options the options to use:
   *          identity the identity to create.
   *          idp the DID for the identity's IdP.
   *          privateKeyPem the private key PEM for the identity.
   *          [password] the password to use to create a hash mapping.
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
      if(typeof options.password !== 'string') {
        // do not create mapping
        return;
      }
      // create signed mapping from the hash to the DID
      var mapping = {
        '@context': 'https://w3id.org/identity/v1',
        id: didio.generateHash(options.identity.label, options.password),
        url: did,
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
      }).then(function(signed) {
        // register mapping
        return Promise.resolve($http.post('/mappings', signed));
      }).then(function(response) {
        if(response.status !== 201) {
          throw response;
        }
      });
    }).then(function() {
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
   *          id the DID for the identity.
   *          label the local identifier for the identity.
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
      id: options.id,
      label: options.label,
      publicKey: {}
    };
    if(options.publicKeyId) {
      identity.publicKey.id = options.publicKeyId;
    } else {
      // generate a sha-256 public key fingerprint for the key ID
      var fingerprint = forge.pki.getPublicKeyFingerprint(
        options.keypair.publicKey, {
          md: forge.md.sha256.create(),
          encoding: 'hex',
          delimiter: ':'
        });
      identity.publicKey.id = 'urn:rsa-public-key-sha256:' + fingerprint;
      if(!options.temporary) {
        identity.sysRegisterKey = true;
      }
    }
    identity.publicKey.type = (options.temporary ?
      ['EphemeralCryptographicKey', 'CryptographicKey'] : 'CryptographicKey');
    identity.publicKey.owner = options.id;
    identity.publicKey.publicKeyPem = forge.pki.publicKeyToPem(
      options.keypair.publicKey);
    if(typeof options.password === 'string') {
      identity.publicKey.privateKeyPem = forge.pki.encryptRsaPrivateKey(
        options.keypair.privateKey,
        _getKeyPassword(identity.label, options.password));
    } else {
      identity.publicKey.privateKeyPem = forge.pki.privateKeyToPem(
        options.keypair.privateKey);
    }
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
