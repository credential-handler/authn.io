define(['node-uuid'], function(uuid) {

'use strict';

/* @ngInject */
function factory($window, aioIdentityService) {
  var service = {};

  var Router = navigator.credentials._Router;

  /**
   * Returns true if the current operation's parameters need to be received.
   *
   * @return true if parameters need to be received, false if not.
   */
  service.needsParameters = function() {
    return !_load('params');
  };

  /**
   * Returns true if the current operation's result needs to be received.
   *
   * @return true if the result needs to be received, false if not.
   */
  service.needsResult = function() {
    return !_load('result');
  };

  /**
   * Gets the parameters for the given operation. This method will
   * request the parameters from the consumer.
   *
   * @param options the options to use:
   *          op the name of the operation to receive parameters for.
   *          origin the origin to receive from.
   *
   * @return a Promise that resolves to the parameters for the operation.
   */
  service.getParameters = function(options) {
    var router = new Router('params', options.origin);
    return router.request(options.op).then(function(message) {
      _save(options.op, 'params', message);
      return message.data;
    });
  };

  /**
   * Gets the result for the given operation. This method will return
   * the locally-cached result.
   *
   * @param options the options to use:
   *          op the name of the operation to get the result for.
   *          origin the origin to receive from.
   *
   * @return the destination origin, original params, and result for the
   *   operation: `{origin: ..., params: ..., result: ...}`.
   */
  service.getResult = function(options) {
    var rpMessage = _load('params');
    var idpMessage = _load('result');
    if(!rpMessage || !idpMessage || idpMessage.origin !== options.origin) {
      throw new Error('Credential protocol error.');
    }
    return {
      origin: rpMessage.origin,
      params: rpMessage.data,
      result: idpMessage.data
    };
  };

  /**
   * Navigates to the IdP for the identity of the current session.
   *
   * @param session the session to use.
   */
  service.navigateToIdp = function(session) {
    var idpUrl = session.idpConfig.credentialManagementUrl;
    $window.location.replace(idpUrl);
  };

  /**
   * Sends an identity as to the consumer as the result of a query.
   *
   * @param identity the identity to send.
   */
  service.sendResult = function(identity) {
    var rpMessage = _load('params');
    if(!rpMessage) {
      throw new Error('Credential protocol error.');
    }
    _save('get', 'result', {origin: rpMessage.origin, data: identity});
    service.proxy({
      op: 'get',
      route: 'result',
      origin: rpMessage.origin
    });
  };

  /**
   * Proxies a message based on the given options. If there is a pending
   * message in session storage for the given options, it will be sent, if
   * there isn't, one will be received and stored and then navigation will
   * occur to handle that message.
   *
   * This call handles messages when no user-mediation is required.
   *
   * @param options the options to use:
   *          op the name of the operation to proxy messages for.
   *          origin the origin to receive from.
   */
  service.proxy = function(options) {
    var message = _load(options.route);
    var session = aioIdentityService.getSession();
    if(!session) {
      // TODO: need better error handling for expired sessions
      // and for different scenarios (auth.io loaded invisibly vs. visibly)
      var origin = (options.route === 'params' ?
        options.origin : message.origin);
      new Router(options.route, origin).send('error');
      return;
    }
    if(message) {
      // TODO: need better error handling during _send, perhaps simply
      // catch (and ensure _send returns a promise) and route an error
      // new Router(options.route, origin).send('error');
      return _send(session, message, options);
    }
    return _receive(options);
  };

  // TODO: document helpers

  function _send(session, message, options) {
    var idpUrl = session.idpConfig.credentialManagementUrl;

    if(options.route === 'params') {
      // credential agent sending to IdP...
      if(_parseOrigin(idpUrl) !== options.origin) {
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
        domain: _parseDomain(options.origin)
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
          domain: _parseDomain(options.origin)
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
    // get RP origin
    var rpMessage = _load('params');
    if(!rpMessage) {
      throw new Error('Credential protocol error.');
    }
    router = new Router(options.route, rpMessage.origin);
    // TODO: if session.identity.sysRegisterKey is set to true and
    // `message.data` contains a public key credential with a did-based id,
    // and the DID document reflects that public key, update
    // `session.publicKey.id` to match the value publicKey ID from
    // `message.data` and update the identity by removing `sysRegisterKey` and
    // set the publicKey ID there as well
    return aioIdentityService.sign({
      document: message.data,
      publicKeyId: session.publicKey.id,
      privateKeyPem: session.privateKeyPem,
      domain: _parseDomain(rpMessage.origin)
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

  function _parseOrigin(url) {
    // `URL` API not supported on IE, use DOM to parse URL
    var parser = document.createElement('a');
    parser.href = url;
    return parser.protocol + '//' + parser.host;
  }

  function _parseDomain(url) {
    // `URL` API not supported on IE, use DOM to parse URL
    var parser = document.createElement('a');
    parser.href = url;
    return parser.host;
  }

  return service;
}

return {aioOperationService: factory};

});
