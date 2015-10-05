define([], function() {

'use strict';

/* @ngInject */
function factory($window, aioIdentityService) {
  var service = {};

  var Router = navigator.credentials._Router;

  /**
   * Returns true if the given operation's parameters need to be received.
   *
   * @param op the name of the operation.
   *
   * @return true if parameters need to be received, false if not.
   */
  service.needsParameters = function(op) {
    return !_load('credentials.' + op + '.params');
  };

  /**
   * Returns true if the given operation's result needs to be received.
   *
   * @param op the name of the operation.
   *
   * @return true if the result needs to be received, false if not.
   */
  service.needsResult = function(op) {
    return !_load('credentials.' + op + '.result');
  };

  /**
   * Proxies a message based on the given options. If there is a pending
   * message in session storage for the given options, it will be sent, if
   * there isn't, one will be received and stored and then navigation will
   * occur to handle that message.
   *
   * TODO: document
   */
  service.proxy = function(options) {
    var message = _load('credentials.' + options.op + '.' + options.route);
    return aioIdentityService.getSession().then(function(session) {
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
      return _receive(session, options);
    });
  };

  // TODO: document

  service.sendCryptographicKeyCredential = function(query, identity) {
    sessionStorage.setItem(
      'credentials.' + query.op + '.result',
      JSON.stringify({
        id: new Date().getTime() + '-' + Math.floor(Math.random() * 100000),
        origin: query.origin,
        data: identity
      }));
    service.proxy({
      op: query.op,
      route: 'result',
      origin: query.origin
    });
  };

  function _send(session, message, options) {
    var router;
    var idpUrl = session.idpConfig.credentialManagementUrl;

    if(options.route === 'params') {
      console.log('credential agent sending to IdP...');
      if(_parseOrigin(idpUrl) !== options.origin) {
        throw new Error('Origin mismatch.');
      }
      router = new Router(options.route, options.origin);
    } else {
      console.log('credential agent sending to RP...');
      if(message.origin !== options.origin) {
        throw new Error('Origin mismatch.');
      }
      // get RP origin
      var rpMessage = _load(options.op, 'params');
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

    router.send(options.op, message.data);
  }

  function _receive(session, options) {
    var idpUrl = session.idpConfig.credentialManagementUrl;
    var router = new Router(options.route, options.origin);

    if(options.route === 'params') {
      console.log('credential agent receiving from RP...');
    } else {
      console.log('credential agent receiving from IdP...');
    }
    router.request(options.op).then(function(message) {
      console.log('credential agent received', message);
      _save(options.op, options.route, message);
      if(options.route === 'params') {
        // navigate to IdP
        $window.location.replace(idpUrl);
      } else {
        // request navigation
        router.navigate();
      }
    });
  }

  function _save(op, route, message) {
    sessionStorage.setItem(
      'credentials.' + op + '.' + route,
      JSON.stringify({
        id: new Date().getTime() + '-' + Math.floor(Math.random() * 100000),
        origin: message.origin,
        data: message.data
      }));
  }

  function _load(op, route) {
    var item = sessionStorage.getItem('credentials.' + op + '.' + route);
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

return {aioProxyService: factory};

});
