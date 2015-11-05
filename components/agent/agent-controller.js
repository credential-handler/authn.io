define(['jsonld', 'node-uuid', 'underscore'], function(jsonld, uuid, _) {

'use strict';

/* @ngInject */
function factory(
  $location, $scope, aioIdentityService, aioOperationService,
  brAlertService, config) {
  var self = this;
  self.isCryptoKeyRequest = false;
  self.did = null;
  self.display = {};
  var query = $location.search();

  var CRYPTO_KEY_REQUEST = {
    '@context': 'https://w3id.org/identity/v1',
    id: '',
    publicKey: ''
  };

  /**
   * Resumes the flow by proxying a message. This function is called
   * for a `get` operation after an identity is chosen and then again later
   * to confirm credential transmission. It is called for a `store` operation
   * after an identity is chosen.
   *
   * @param err an error if one occurred.
   * @param session set to the selected session if an identity chooser was used.
   */
  self.complete = function(err, session) {
    if(err) {
      return brAlertService.add('error', err);
    }
    if(!self.isCryptoKeyRequest || !_isKeyPermanent(session)) {
      if(query.op === 'get' && query.route === 'params') {
        // go to IdP to handle query
        return aioOperationService.navigateToIdp(session);
      }
      return aioOperationService.proxy(query);
    }

    // special handle request for permanent public key credential:

    // TODO: this could be potentially optimized away by reusing the
    // identity created during aioOperationService.sendResult() that is
    // attached to the message data

    // clone template
    var identity = JSON.parse(JSON.stringify(
      config.data.identityWithCryptographicKeyCredentialTemplate));
    identity.id = session.id;
    var credential = identity.credential[0]['@graph'];
    credential.id = 'urn:ephemeral:' + uuid.v4();
    credential.claim = {
      id: session.id,
      publicKey: {
        id: session.publicKey.id,
        owner: session.publicKey.owner,
        publicKeyPem: session.publicKey.publicKeyPem
      }
    };
    aioIdentityService.sign({
      document: credential,
      publicKeyId: session.publicKey.id,
      privateKeyPem: session.privateKeyPem
    }).then(function(signed) {
      identity.credential[0]['@graph'] = signed;
      return aioOperationService.sendResult(identity);
    }).catch(function(err) {
      brAlertService.add('error', err);
    }).then(function() {
      $scope.$apply();
    });
  };

  /**
   * Cancels sending any information to the consumer.
   */
  self.cancel = function() {
    aioOperationService.sendResult(null);
  };

  // we're receiving parameters from the RP or sending them to the IdP
  if(query.route === 'params') {
    if(aioOperationService.needsParameters(query)) {
      // flow is just starting, get parameters from RP
      return aioOperationService.getParameters(query).then(function(params) {
        if(query.op === 'get') {
          // special handle request for public key credential
          self.isCryptoKeyRequest = _isCryptoKeyRequest(params.query);
          // always show identity chooser for `get` requests even if a
          // specific DID was requested
          if('id' in params.query && params.query.id) {
            self.did = params.query.id;
          }
          self.display.identityChooser = true;
          $scope.$apply();
          return;
        }

        if(query.op === 'store') {
          // only show identity chooser if can't auto-authenticate as owner
          var owner = _getOwnerId(params);
          return aioIdentityService.createSession(owner)
            .catch(function(err) {
              self.did = owner;
              self.display.identityChooser = true;
            }).then(function(session) {
              if(session) {
                self.display.redirectOrigin = query.origin;
                // go to IdP to handle storage request
                return aioOperationService.navigateToIdp(session);
              }
            }).then(function() {
              $scope.$apply();
            });
        }

        // TODO: handle invalid op
      });
    }

    // already have parameters, we're invisibly proxing them to the IdP
    return aioOperationService.proxy(query);
  }

  // we're receiving the result from the IdP or sending it to the RP
  if(query.route === 'result') {
    if(aioOperationService.needsResult(query)) {
      // no result received from IdP yet, we're invisibly proxying it and
      // then we'll reload as the main application in the flow to do something
      // further with the result
      return aioOperationService.proxy(query);
    }

    // if this is a storage request, proxy the result w/o need to confirm
    if(query.op === 'store') {
      self.display.redirectOrigin = query.origin;
      return aioOperationService.proxy(query);
    }

    // display confirmation page before transmitting result
    self.display.confirm = true;
    self.result = aioOperationService.getResult(query);
  }

  // TODO: handle invalid query

  function _getOwnerId(identity) {
    return identity.credential[0]['@graph'].claim.id;
  }

  function _isKeyPermanent(identity) {
    return ('id' in identity.publicKey && !jsonld.hasValue(
      identity.publicKey, 'type', 'EphemeralCryptographicKey'));
  }

  function _isCryptoKeyRequest(query) {
    // query may have `id` set -- this doesn't affect whether or not it is
    // a crypto key request
    query = _.extend({}, query);
    if('id' in query) {
      query.id = '';
    }
    return _.isEqual(query, CRYPTO_KEY_REQUEST);
  }
}

return {aioAgentController: factory};

});
