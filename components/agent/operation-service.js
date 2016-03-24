define(['jsonld', 'node-uuid'], function(jsonld, uuid) {

'use strict';

/* @ngInject */
function factory($window, aioIdentityService) {
  var service = {};

  var Router = navigator.credentials._Router;

  /**
   * Gets the parameters for the given operation. This method will
   * request the parameters from the relying party.
   *
   * @param origin the relying party's origin.
   *
   * @return a Promise that resolves to the parameters for the operation.
   */
  service.getParameters = function(origin) {
    var router = new Router(service.parseOrigin(origin));
    return router.request('params').then(function(message) {
      // build params from message data
      var params = {};
      if(message.op === 'get') {
        params.options = message.data;
      } else {
        params.options = {};
        params.options.store = message.data;
      }
      return params;
    });
  };

  /**
   * Delegates the credential operation to the loaded credential repository.
   *
   * @param options the options to use:
   *          op the API operation.
   *          params the parameters to send.
   *          repoUrl the Repo URL.
   *          repoHandle the handle to the repo iframe.
   *
   * @return a Promise that resolves to the result returned from the Repo.
   */
  service.delegateToRepo = function(options) {
    var session = aioIdentityService.getSession();
    var op = options.op;
    var params = options.params;
    var repoOrigin = service.parseOrigin(options.repoUrl);

    /* use once credentials-polyfill < 0.8.x is no longer supported
    // serve params to Repo
    var router = new Router(repoOrigin, {handle: options.repoHandle});
    return router.receive('request').then(function() {
      return updateParameters();
    }).then(function() {
      router.send(op + '.params', params);
    }).then(function() {
      // receive result from Repo
      return router.receive(op + '.result');
    });*/

    // the code path below includes backwards compatibility for potentially
    // receiving from a legacy iframe proxy, remove once no longer supported:

    // receive request for parameters
    console.log('agent serving params...');
    return receiveFromRepoOrProxy().then(function(e) {
      // update parameters
      return updateParameters().then(function() {
        // send parameters
        e.source.postMessage({type: op + '.params', data: params}, e.origin);

        // receive result
        console.log('agent receiving result...');
        receiveFromRepoOrProxy().then(function(e) {
          return e.data;
        });
      });
    }).then(function(result) {
      // if key registration was requested, check to see if it occurred
      if(session.sysRegisterKey) {
        // determine if session key was registered by finding matching key
        // in a credential in the message with a new DID-based identifier
        var matchingKey = _getCryptographicKeyFromCredential(
          message.data, session.publicKey);
        if(matchingKey.id !== session.publicKey.id &&
          matchingKey.id.indexOf(session.id) === 0) {
          // TODO: do a look up on the key to ensure it actually exists in DHT,
          // don't assume

          // key matches, make identity permanent
          session.sysRegisterKey = false;
          session.publicKey.id = matchingKey.id;
          aioIdentityService.makePermanent(session.id, matchingKey.id);
        }
      }
      return result;
    });

    function receiveFromRepoOrProxy() {
      // will either receive a message from the repo (>= 0.8.x) or from
      // the iframe auth.io proxy (< 0.8.x)
      return new Promise(function(resolve, reject) {
        // TODO: add timeout
        window.addEventListener('message', listener);
        function listener(e) {
          console.log('receive listener', e);
          console.log('got type', e.data.type);
          console.log('e.source.origin', e.origin);
          // validate message
          if(typeof e.data === 'object' && e.data.type === 'request' &&
            'data' in e.data) {
            // ensure source is either `Repo window + Repo origin`
            // or `this site`
            if((e.source === options.repoHandle &&
              e.origin === repoOrigin) ||
              e.origin === window.location.origin) {
              console.log('received data', e.data);
              return resolve(e);
            }
          }
          reject(new Error('Credential protocol error.'));
        }
      });
    }

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
      return aioIdentityService.sign({
        document: credential,
        publicKeyId: session.publicKey.id,
        privateKeyPem: session.privateKeyPem,
        domain: service.parseDomain(options.origin)
      }).then(function(signed) {
        // digitally-sign identity for use at IdP
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
          domain: service.parseDomain(options.origin)
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
   * @param op the API operation.
   * @param identity the identity to send.
   * @param origin the relying party's origin.
   */
  service.sendResult = function(op, identity, origin) {
    // ensure session has not expired
    var session = aioIdentityService.getSession();
    if(!session) {
      // TODO: need better error handling for expired sessions
      // and for different scenarios (auth.io loaded invisibly vs. visibly)
      new Router(document.referrer, {handle: window.parent}).send('error');
      return;
    }

    var router = new Router(service.parseOrigin(origin));

    // flow complete, clear session
    aioIdentityService.clearSession();

    // sign identity and route it
    return aioIdentityService.sign({
      document: identity,
      publicKeyId: session.publicKey.id,
      privateKeyPem: session.privateKeyPem,
      domain: service.parseDomain(origin)
    }).then(function(signed) {
      identity = signed;
      router.send(op, 'result', identity);
    });
  };

  /**
   * **deprecated since credentials-polyfill 0.8.x**
   *
   * Proxies a message based on the given options.
   *
   * @param route either `params` or `result`.
   */
  service.proxy = function(route) {
    // ensure session has not expired
    var session = aioIdentityService.getSession();
    if(!session) {
      // TODO: need better error handling for expired sessions
      // and for different scenarios (auth.io loaded invisibly vs. visibly)
      new Router(document.referrer, {handle: window.parent}).send('error');
      return;
    }

    // define end points to proxy between
    var agent = {origin: window.location.origin, handle: window.top};
    var repo = {
      origin: service.parseOrigin(session.idpConfig.credentialManagementUrl),
      handle: window.parent
    };
    var order;
    if(route === 'params') {
      // proxy from agent -> repo
      console.log('proxy params from credential agent to repo...');
      order = [agent, repo];
    } else {
      // proxy from repo -> agent
      console.log('proxy result from repo to credential agent...');
      order = [repo, agent];
    }
    var router = new Router(order[0].origin, {handle: order[0].handle});
    return router.request(route).then(function(message) {
      router = new Router(order[1].origin, {handle: order[1].handle});
      var split = message.type.split('.');
      router.send(split[0], split[1], message.data);
    });
  };

  /**
   * Parses out the origin for the given URL.
   *
   * @param url the URL to parse.
   *
   * @return the URL's origin.
   */
  service.parseOrigin = function(url) {
    // `URL` API not supported on IE, use DOM to parse URL
    var parser = document.createElement('a');
    parser.href = url;
    return parser.protocol + '//' + parser.host;
  };

  /**
   * Parses out the domain for the given URL.
   *
   * @param url the URL to parse.
   *
   * @return the URL's domain.
   */
  service.parseDomain = function(url) {
    // `URL` API not supported on IE, use DOM to parse URL
    var parser = document.createElement('a');
    parser.href = url;
    return parser.host;
  };

  // TODO: document helpers

  function _send(session, message, options) {
    var idpUrl = session.idpConfig.credentialManagementUrl;

    if(options.route === 'params') {
      // credential agent sending to IdP...
      if(service.parseOrigin(idpUrl) !== options.origin) {
        throw new Error('Origin mismatch.');
      }
      var router = new Router(options.route, options.origin);

      // build params to send from message data
      var params = {};
      if(message.op === 'get') {
        params.options = message.data;
      } else {
        params.options = {};
        params.options.store = message.data;
      }

      // add a signed identity w/a cryptographic key credential to the
      // parameters so the IdP can:
      // 1. authenticate the user if necessary and if the key is not ephemeral
      // 2. vouch for a public key by resigning the credential to prevent the
      //   consumer from having to fetch it and leak information about
      //   consumer+user interactions or to allow an ephemeral key to be used
      // 3. register a new key on behalf of the user

      var publicKey = {
        '@context': session['@context']
      };
      publicKey.id = session.publicKey.id;
      publicKey.type = session.publicKey.type;
      publicKey.owner = session.publicKey.owner;
      publicKey.publicKeyPem = session.publicKey.publicKeyPem;

      // TODO: remove (only present for temporary backwards compatibility)
      if(message.op === 'get') {
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
      return aioIdentityService.sign({
        document: credential,
        publicKeyId: session.publicKey.id,
        privateKeyPem: session.privateKeyPem,
        domain: service.parseDomain(options.origin)
      }).then(function(signed) {
        // digitally-sign identity for use at IdP
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
          domain: service.parseDomain(options.origin)
        });
      }).then(function(signed) {
        // TODO: remove if+else (only present for temporary backwards
        // compatibility)
        if(message.op === 'get') {
          params.identity = signed;
        } else {
          params.identity = params.options.store;
        }
        params.options.identity = signed;
        if(session.sysRegisterKey) {
          params.options.registerKey = true;
        }
        router.send(message.op, params);
      });
    }

    // credential agent sending to RP...
    if(message.origin !== options.origin) {
      throw new Error('Origin mismatch.');
    }

    // if key registration was requested, check to see if it occurred
    if(session.sysRegisterKey) {
      // determine if session key was registered by finding matching key
      // in a credential in the message with a new DID-based identifier
      var matchingKey = _getCryptographicKeyFromCredential(
        message.data, session.publicKey);
      if(matchingKey.id !== session.publicKey.id &&
        matchingKey.id.indexOf(session.id) === 0) {
        // TODO: do a look up on the key to ensure it actually exists in DHT,
        // don't assume

        // key matches, make identity permanent
        session.sysRegisterKey = false;
        session.publicKey.id = matchingKey.id;
        aioIdentityService.makePermanent(session.id, matchingKey.id);
      }
    }

    // get RP origin to route to it
    var rpMessage = _load('params');
    if(!rpMessage) {
      throw new Error('Credential protocol error.');
    }
    router = new Router(options.route, rpMessage.origin);

    // flow complete, clear session
    aioIdentityService.clearSession();

    // sign message and route it
    return aioIdentityService.sign({
      document: message.data,
      publicKeyId: session.publicKey.id,
      privateKeyPem: session.privateKeyPem,
      domain: service.parseDomain(rpMessage.origin)
    }).then(function(signed) {
      message.data = signed;
      router.send(message.op, message.data);
    });
  }

  function _receive(options) {
    var router = new Router(options.route, options.origin);
    router.request(options.op).then(function(message) {
      _save(options.op, options.route, message);
      // request navigation
      router.navigate();
    });
  }

  function _save(op, route, message) {
    sessionStorage.setItem(
      'authio.operation.' + route,
      JSON.stringify({
        origin: message.origin,
        op: op,
        data: message.data
      }));
  }

  function _load(route) {
    var item = sessionStorage.getItem('authio.operation.' + route);
    if(item) {
      try {
        item = JSON.parse(item);
      } catch(err) {
        item = null;
      }
    }
    return item;
  }

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

return {aioOperationService: factory};

});
