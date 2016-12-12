/*!
 * New BSD License (3-clause)
 * Copyright (c) 2015-2016, Digital Bazaar, Inc.
 * Copyright (c) 2015-2016, Accreditrust Technologies, LLC
 * All rights reserved.
 */
define(['angular', 'node-uuid', 'lodash'], function(angular, uuid, _) {

'use strict';

function register(module) {
  module.component('aioAgent', {
    controller: Ctrl,
    templateUrl: requirejs.toUrl('authio/agent-component.html')
  });
}

/* @ngInject */
function Ctrl(
  $location, $sce, $rootScope, $scope, $window,
  aioIdentityService, aioOperationService, brAlertService, config) {
  var self = this;
  self.route = $rootScope.route;
  self.isCryptoKeyRequest = false;
  self.did = null;
  self.display = {};
  var query = $location.search();
  self.op = query.op;

  var relyingParty = query.origin;
  self.relyingParty = aioOperationService.parseDomain(relyingParty);

  var resultSent = false;

  // TODO: handle invalid query

  var CRYPTO_KEY_REQUEST = {
    '@context': 'https://w3id.org/identity/v1',
    id: '',
    publicKey: ''
  };

  /**
   * Called when an identity is selected in the identity chooser.
   *
   * @param id the ID of the identity that was selected.
   */
  self.identitySelected = function(id) {
    // create a session based on the selected identity
    return aioIdentityService.createSession(id).then(
      self.complete.bind(self, null),
      self.complete.bind(self));
  };

  /**
   * Resumes the flow by proxying a message. This function is called after an
   * identity has been chosen.
   *
   * @param err an error if one occurred.
   * @param session the session associated with the selected identity.
   */
  self.complete = function(err, session) {
    if(err) {
      brAlertService.add('error', err);
      $scope.$apply();
      return;
    }

    // get result (from either Repo or ourselves)
    var getResult;
    if(!self.isCryptoKeyRequest || !_isKeyDidBased(session)) {
      // need Repo to fulfill the request...

      // display Repo in iframe to handle request
      self.repoUrl = $sce.trustAsResourceUrl(
        session.idpConfig.credentialManagementUrl);
      self.display.identityChooser = false;
      self.display.repo = true;
      self.display.repoLoading = true;
      $scope.$apply();

      // get iframe handle
      var iframe = angular.element('iframe[name="repo"]');
      var repoHandle = iframe[0].contentWindow;

      // delegate to Repo
      getResult = aioOperationService.delegateToRepo({
        op: query.op,
        params: self.params,
        repoUrl: session.idpConfig.credentialManagementUrl,
        repoHandle: repoHandle,
        onload: function() {
          self.display.repoLoading = false;
          $scope.$apply();
        }
      });
    } else {
      // can special handle request for permanent public key credential
      // on our own (no Repo required)...
      self.display.identityChooser = false;
      self.display.authenticating = true;
      $scope.$apply();

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
      return _sendResult(result);
    }).catch(function(err) {
      // TODO: need better error handling -- we need to send an error back
      // to the relying party after displaying the problem on auth.io
      brAlertService.add('error', err);
    }).then(function() {
      self.display.authenticating = false;
      $scope.$apply();
    });
  };

  /**
   * Cancels sending any information to the relying party.
   */
  self.cancel = function() {
    _sendResult(null);
  };

  $window.addEventListener('beforeunload', function() {
    _sendResult(null);
  });

  // flow is just starting, clear old session
  aioIdentityService.clearSession();

  // request parameters from RP
  aioOperationService.getParameters({
    op: self.op,
    origin: relyingParty
  }).then(function(params) {
    self.params = params;
    var options = params.options;

    if(query.op === 'get') {
      // special handle request for public key credential
      self.isCryptoKeyRequest = _isCryptoKeyRequest(options.query);
      // always show identity chooser for `get` requests even if a
      // specific DID was requested
      if('id' in options.query && options.query.id) {
        self.did = options.query.id;
      }
      self.display.identityChooser = true;
      $scope.$apply();
      return;
    }

    if(query.op === 'store') {
      // only show identity chooser if can't auto-authenticate as owner
      var owner = _getOwnerId(options.store);
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

  function _sendResult(result) {
    if(resultSent) {
      return;
    }
    resultSent = true;
    return aioOperationService.sendResult(self.op, result, relyingParty);
  }
}

return register;

});
