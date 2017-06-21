/*!
 * New BSD License (3-clause)
 * Copyright (c) 2015-2017, Digital Bazaar, Inc.
 * Copyright (c) 2015-2017, Accreditrust Technologies, LLC
 * All rights reserved.
 */
import jsonld from 'jsonld';
import uuid from 'node-uuid';

/* @ngInject */
export default function factory(aioIdentityService, aioUtilService) {
  var service = {};

  var Router = navigator.credentials._Router;

  /**
   * Gets the parameters for the given operation. This method will
   * request the parameters from the relying party.
   *
   * @param options the options to use:
   *          op the name of the API operation.
   *          origin the relying party's origin.
   *
   * @return a Promise that resolves to the parameters for the operation.
   */
  service.getParameters = function(options) {
    var router = new Router(aioUtilService.parseOrigin(options.origin));
    return router.request(options.op, 'params').then(function(message) {
      // build params from message data
      var params;
      if(message.op === 'get') {
        params = {options: message.data};
      } else if(message.op === 'store') {
        params = {options: {store: message.data}};
      } else {
        params = message.data;
      }
      return params;
    });
  };

  /**
   * Delegates the credential operation to the loaded credential repository.
   *
   * @param options the options to use:
   *          op the name of the API operation.
   *          params the parameters to send.
   *          repoUrl the Repo URL.
   *          repoHandle the handle to the repo iframe.
   *          onload handler for when the repo has requested parameters.
   *
   * @return a Promise that resolves to the result returned from the Repo.
   */
  service.delegateToRepo = function(options) {
    var session = aioIdentityService.getSession();
    var op = options.op;
    var params = options.params;
    var repoOrigin = aioUtilService.parseOrigin(options.repoUrl);

    // serve params to Repo
    var router = new Router(repoOrigin, {handle: options.repoHandle});
    return router.receive('request').then(function() {
      if(options.onload) {
        options.onload();
      }
      return updateParameters();
    }).then(function() {
      router.send(op, 'params', params);
    }).then(function() {
      // receive result from Repo
      return router.receive(op + '.result');
    }).then(function(message) {
      var result = message.data || null;
      // if key registration was requested, check to see if it occurred
      if(result && session.sysRegisterKey) {
        // determine if session key was registered by finding matching key
        // in a credential in the message with a new DID-based identifier
        var matchingKey = _getCryptographicKeyFromCredential(
          result, session.publicKey);
        if(matchingKey.id !== session.publicKey.id &&
          matchingKey.id.indexOf(session.id) === 0) {
          // TODO: do a look up on the key to ensure it actually exists in DHT,
          // don't assume

          // key matches, make identity permanent
          aioIdentityService.makePermanent(session.id, matchingKey.id);
        }
      }
      return result;
    });

    function updateParameters() {
      // add a signed identity w/a cryptographic key credential to the
      // parameters so the Repo can:
      // 1. authenticate the user if necessary and if the key is not ephemeral
      // 2. vouch for a public key by resigning the credential to prevent the
      //   consumer from having to fetch it and leak information about
      //   consumer+user interactions or to allow an ephemeral key to be used
      // 3. register a new key on behalf of the user

      var publicKey = {'@context': session['@context']};
      publicKey.id = session.publicKey.id;
      publicKey.type = session.publicKey.type;
      publicKey.owner = session.publicKey.owner;
      publicKey.publicKeyPem = session.publicKey.publicKeyPem;

      // TODO: remove (only present for temporary backwards compatibility)
      if(op === 'get') {
        params.publicKey = publicKey;
      }

      // wrap public key in a CryptographicKeyCredential and sign it
      var credential = {
        '@context': 'https://w3id.org/identity/v1',
        id: 'urn:ephemeral:' + uuid.v4(),
        type: ['Credential', 'CryptographicKeyCredential'],
        claim: {
          id: publicKey.owner,
          publicKey: publicKey
        }
      };
      // digitally-sign credential for use at Repo
      return aioIdentityService.sign({
        document: credential,
        publicKeyId: session.publicKey.id,
        privateKeyPem: session.privateKeyPem,
        domain: aioUtilService.parseDomain(options.repoUrl)
      }).then(function(signed) {
        // digitally-sign identity for use at Repo
        var identity = {
          '@context': 'https://w3id.org/identity/v1',
          id: publicKey.owner,
          type: 'Identity',
          credential: {'@graph': signed}
        };
        return aioIdentityService.sign({
          document: identity,
          publicKeyId: session.publicKey.id,
          privateKeyPem: session.privateKeyPem,
          domain: aioUtilService.parseDomain(options.repoUrl)
        });
      }).then(function(signed) {
        // TODO: remove if+else (only present for temporary backwards
        // compatibility)
        if(op === 'get') {
          params.identity = signed;
        } else {
          params.identity = params.options.store;
        }
        params.options.identity = signed;
        if(session.sysRegisterKey) {
          params.options.registerKey = true;
        }
      });
    }
  };

  /**
   * Digitally-signs and sends an identity to the relying party as the result
   * of an API operation.
   *
   * @param op the name of the API operation.
   * @param identity the identity to send.
   * @param origin the relying party's origin.
   */
  service.sendSignedIdentity = function(op, identity, origin) {
    var router = new Router(aioUtilService.parseOrigin(origin));

    // ensure session has not expired
    var session = aioIdentityService.getSession();
    if(identity && !session) {
      // TODO: need better error handling for expired sessions
      // and for different scenarios (auth.io loaded invisibly vs. visibly)
      router.send(op, 'error', null);
      // router.send(op, 'error', {message: 'Session expired.'});
      return;
    }

    // flow complete, clear session
    aioIdentityService.clearSession();

    if(!identity) {
      // send null
      router.send(op, 'result', null);
      return;
    }

    // sign identity and route it
    return aioIdentityService.sign({
      document: identity,
      publicKeyId: session.publicKey.id,
      privateKeyPem: session.privateKeyPem,
      domain: aioUtilService.parseDomain(origin)
    }).then(function(signed) {
      identity = signed;
      router.send(op, 'result', identity);
    });
  };

  /**
   * Sends the passed result to the relying party as the result of an API
   * operation.
   *
   * @param op the name of the API operation.
   * @param result the result to send.
   * @param origin the relying party's origin.
   */
  service.sendResult = function(op, result, origin) {
    // flow complete, clear session
    aioIdentityService.clearSession();

    // route result to target origin
    var router = new Router(aioUtilService.parseOrigin(origin));
    router.send(op, 'result', result);
  };

  /**
   * Sends an error as the result of an API operation.
   *
   * @param op the name of the API operation.
   * @param error the error text to send.
   * @param origin the relying party's origin.
   */
  service.sendError = function(op, error, origin) {
    var router = new Router(aioUtilService.parseOrigin(origin));
    router.send(op, 'error', {message: error});
  };

  // TODO: document helpers

  function _getCryptographicKeyFromCredential(identity, keyToMatch) {
    // TODO: make more robust by framing identity, etc.?
    var credentials = jsonld.getValues(identity, 'credential');
    for(var i = 0; i < credentials.length; ++i) {
      var credential = credentials[0]['@graph'];
      if(jsonld.hasValue(credential, 'type', 'CryptographicKeyCredential')) {
        var key = credential.claim.publicKey;
        if(credential.claim.id === identity.id && key.owner === identity.id &&
          key.owner === keyToMatch.owner &&
          // TODO: parse key PEM and compare key components, do not assume
          // that a change in PEM means its not the same key
          key.publicKeyPem === keyToMatch.publicKeyPem) {
          return key;
        }
      }
    }
    return null;
  }

  return service;
}
