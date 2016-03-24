define(['angular', 'jsonld', 'node-uuid', 'lodash'], function(
  angular, jsonld, uuid, _) {

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
  self.op = query.op;

  // TODO: might need to be `document.referrer`
  var relyingParty = window.opener.location.href;
  self.relyingParty = aioOperationService.parseDomain(relyingParty);
  console.log('relyingParty', self.relyingParty);

  // TODO: handle invalid query

  var CRYPTO_KEY_REQUEST = {
    '@context': 'https://w3id.org/identity/v1',
    id: '',
    publicKey: ''
  };

  /**
   * Resumes the flow by proxying a message. This function is called after an
   * identity has been chosen.
   *
   * @param err an error if one occurred.
   * @param session set to the selected session if an identity chooser was used.
   */
  self.complete = function(err, session) {
    if(err) {
      return brAlertService.add('error', err);
    }

    // get result (from either Repo or ourselves)
    var getResult;
    if(!self.isCryptoKeyRequest || !_isKeyDidBased(session)) {
      // need Repo to fulfill the request...

      // display Repo in iframe to handle request
      self.repoUrl = session.idpConfig.credentialManagementUrl;
      self.display.repo = true;
      $scope.$apply();

      // get iframe handle
      var iframe = angular.element('iframe[name="repo"]')[0];
      var repoHandle = iframe.contentWindow;

      // delegate to Repo
      getResult = aioOperationService.delegateToRepo({
        op: query.op,
        params: self.params,
        repoUrl: self.repoUrl,
        repoHandle: repoHandle
      });
    } else {
      // can special handle request for permanent public key credential
      // on our own (no Repo required)...

      // clone identity template
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
      getResult = aioIdentityService.sign({
        document: credential,
        publicKeyId: session.publicKey.id,
        privateKeyPem: session.privateKeyPem
      }).then(function(signed) {
        identity.credential[0]['@graph'] = signed;
        return identity;
      });
    }

    // send result to RP
    getResult.then(function(result) {
      return aioOperationService.sendResult(query.op, result, relyingParty);
    }).catch(function(err) {
      // TODO: need better error handling -- we need to send an error back
      // to the relying party after displaying the problem on auth.io
      brAlertService.add('error', err);
    }).then(function() {
      $scope.$apply();
    });
  };

  /**
   * Cancels sending any information to the relying party.
   */
  self.cancel = function() {
    aioOperationService.sendResult(null);
  };

  // caller is using credentials-polyfill < 0.8.x
  // FIXME: remove once support for < 0.8.x dropped
  if(window.frameElement) {
    // handle legacy iframe proxy
    return aioOperationService.proxy(query.route);
  }

  // caller is using credentials-polyfill >= 0.8.x

  // flow is just starting, clear old session
  aioIdentityService.clearSession();

  // request parameters from RP
  return aioOperationService.getParameters(relyingParty).then(function(params) {
    self.params = params;

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
          // should not auto-authenticate, show identity chooser
          self.did = owner;
          self.display.identityChooser = true;
        }).then(function(session) {
          if(session) {
            // auto-authenticate worked, complete flow
            self.complete(null, session);
          }
        }).then(function() {
          $scope.$apply();
        });
    }

    // TODO: handle invalid op better, provide more guidance to user and
    // send error back to relying party
    throw new Error(
      'The website you visited made an unsupported credential request. ' +
      'Please contact their technical support team for assistance.');
  }).catch(function(err) {
    brAlertService.add('error', err);
    $scope.$apply();
  });

  function _getOwnerId(identity) {
    return identity.credential[0]['@graph'].claim.id;
  }

  function _isKeyDidBased(identity) {
    return (identity.publicKey.id.indexOf('did') === 0);
  }

  function _isCryptoKeyRequest(query) {
    // query may have `id` set -- this doesn't affect whether or not it is
    // a crypto key request
    query = _.assign({}, query);
    if('id' in query) {
      query.id = '';
    }
    return _.isEqual(query, CRYPTO_KEY_REQUEST);
  }
}

return {aioAgentController: factory};

});
