define(['jsonld', 'underscore'], function(jsonld, _) {

'use strict';

/* @ngInject */
function factory(
  $location, $scope, aioIdentityService, aioProxyService,
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
      return aioProxyService.proxy(query);
    }

    // special handle request for permanent public key credential:

    // clone template
    var identity = JSON.parse(JSON.stringify(
      config.data.identityWithCryptographicKeyCredentialTemplate));
    identity.id = session.id;
    identity.signature.creator = session.publicKey.id;
    var credential = identity.credential[0]['@graph'];
    credential.claim = {
      id: session.id,
      publicKey: {
        id: session.publicKey.id,
        owner: session.publicKey.owner,
        publicKeyPem: session.publicKey.publicKeyPem
      }
    };
    delete credential.signature;
    aioIdentityService.sign({
      document: credential,
      publicKeyId: session.publicKey.id,
      privateKeyPem: session.privateKeyPem
    }).then(function(signed) {
      identity.credential[0]['@graph'] = signed;
      aioProxyService.sendCryptographicKeyCredential(query, identity);
    }).catch(function(err) {
      brAlertService.add('error', err);
    }).then(function() {
      $scope.$apply();
    });
  };

  // we're receiving parameters from the RP or sending them to the IdP
  if(query.route === 'params') {
    if(aioProxyService.needsParameters(query)) {
      // flow is just starting, get parameters from RP
      return aioProxyService.getParameters(query).then(function(params) {
        if(query.op === 'get') {
          // special handle request for public key credential
          self.isCryptoKeyRequest = _.isEqual(params, CRYPTO_KEY_REQUEST);
          // always show identity chooser for `get` requests
          self.display.identityChooser = true;
          $scope.$apply();
          return;
        }

        if(query.op === 'store') {
          // only show identity chooser if can't auto-authenticate as owner
          var owner = _getOwnerId(params);
          aioIdentityService.createSession(owner).then(function() {
            self.display.redirectOrigin = query.origin;
          }).catch(function(err) {
            self.did = owner;
            self.display.identityChooser = true;
          }).then(function() {
            $scope.$apply();
          });
        }
      });
    }

    // already have parameters, we're invisibly proxing them to the IdP
    return aioProxyService.proxy(query);
  }

  // we're receiving the result from the IdP or sending it to the RP

  if(aioProxyService.needsResult(query)) {
    // no result received from IdP yet, we're invisibly proxying it and
    // then we'll reload as the main application in the flow to do something
    // further with the result
    return aioProxyService.proxy(query);
  }

  // if this is a storage request, proxy the result w/o need to confirm
  if(query.op === 'store') {
    self.display.redirectOrigin = query.origin;
    return aioProxyService.proxy(query);
  }

  // display confirmation page before transmitting result
  self.display.confirm = true;

  function _getOwnerId(identity) {
    return identity.credential[0]['@graph'].claim.id;
  }

  function _isKeyPermanent(identity) {
    return ('id' in identity.publicKey && !jsonld.hasValue(
      identity.publicKey, 'type', 'EphemeralCryptographicKey'));
  }
}

return {aioProxyController: factory};

});
