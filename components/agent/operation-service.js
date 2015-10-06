define([], function() {

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
   * @return the result for the operation.
   */
  service.getResult = function(options) {
    var message = _load('result');
    if(!message || message.origin !== options.origin) {
      throw new Error('Credential protocol error.');
    }
    return message.data;
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
   * Sends an identity containing a CryptographicKeyCredential to the consumer
   * as the result of a query.
   *
   * @param query the query for the credential.
   * @param identity the identity to send.
   */
  service.sendCryptographicKeyCredential = function(query, identity) {
    _save('get', 'result', {origin: query.origin, data: identity});
    service.proxy({
      op: 'get',
      route: 'result',
      origin: query.origin
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
      return _send(session, message, options);
    }
    return _receive(options);
  };

  // TODO: document helpers

  function _send(session, message, options) {
    var router;
    var idpUrl = session.idpConfig.credentialManagementUrl;

    if(options.route === 'params') {
      // credential agent sending to IdP...
      if(_parseOrigin(idpUrl) !== options.origin) {
        throw new Error('Origin mismatch.');
      }
      // include public key in parameters
      if(options.op === 'get') {
        var publicKey = message.data.publicKey = {
          '@context': session.publicKey['@context']
        };
        if(session.publicKey.id) {
          publicKey.id = session.publicKey.id;
        }
        publicKey.type = session.publicKey.type;
        publicKey.owner = session.publicKey.owner;
        publicKey.publicKeyPem = session.publicKey.publicKeyPem;
      }
      router = new Router(options.route, options.origin);
    } else {
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
      // TODO: update session.publicKey.id if unset and IdP has set it
      // in `message.data` and the DID document now reflects it
      // TODO: digitally-sign message.data
      /*aioIdentityService.sign({
        document: message.data,
        publicKeyId: session.publicKey.id,
        privateKeyPem: session.privateKeyPem
      }).then(function(signed) {
        message.data = signed;
      });*/
    }

    router.send(message.op, message.data);
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

  return service;
}

return {aioOperationService: factory};

});
