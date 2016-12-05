/*!
 * Copyright (c) 2016 Digtal Bazaar, Inc. All rights reserved.
 */
define([], function() {

'use strict';

function register(module) {
  module.component('aioRegister', {
    controller: Ctrl,
    templateUrl: requirejs.toUrl('authio/register-component.html')
  });
}

/* @ngInject */
function Ctrl(
  $location, $scope, $timeout,
  aioIdentityService, aioOperationService, brAlertService) {
  var self = this;
  self.email = '';
  self.loading = false;
  self.generating = false;
  self.registering = false;
  self.display = {};
  self.display.polyfill = false;

  // get register parameters
  self.loading = true;
  var origin = $location.search().origin;
  var router = new navigator.credentials._Router(origin);
  router.request('registerDid', 'params').then(function(message) {
    // TODO: handle other parameters
    self.domain = aioOperationService.parseDomain(message.origin);
    self.idp = message.data.idp;
    if('name' in message.data) {
      self.email = message.data.name;
    }
  }).catch(function(err) {
    brAlertService.add('error', err);
  }).then(function() {
    self.loading = false;
    $scope.$apply();
  });

  /**
   * Validates the form, and if valid, performs registration.
   */
  self.validateForm = function() {
    $scope.$on('identityService.register.progress', function(e, data) {
      self.generating = false;
      self.registering = true;
      self.secondsLeft = data.secondsLeft;
      $timeout(_updateSecondsLeft, 1000);
    });
    self.generating = true;

    // first check to see if requested email already stored locally; this
    // step is intended to handle incomplete registrations that created
    // a DID but the repo failed to record it
    aioIdentityService.load({
      identifier: self.email,
      repo: self.idp,
      temporary: false,
      create: false
    }).catch(function(err) {
      // ignore, proceed with registration
    }).then(function(identity) {
      if(identity) {
        // get DID document to return as registration info
        return aioIdentityService.getDidDocument(identity.id)
          .then(function(didDocument) {
            if(didDocument.idp === self.idp) {
              return {didDocument: didDocument};
            }
            // IDP not a match, so can't be an incomplete registration
            return null;
          });
      }
      return null;
    }).then(function(registrationInfo) {
      if(registrationInfo) {
        // TODO: show a message indicating that an existing, but incomplete
        // registration was possible detected and give the user a chance
        // to continue it now or just create something new ... many users
        // won't know what to do here so perhaps not useful to ask
        return registrationInfo;
      }
      return aioIdentityService.register({
        identifier: self.email,
        idp: self.idp,
        scope: $scope
      });
    }).then(function(registrationInfo) {
      self.registering = false;
      var router = new navigator.credentials._Router(origin);
      router.send('registerDid', 'result', registrationInfo.didDocument);
    }).catch(function(err) {
      console.error('Failed to register with the network.', err);
      brAlertService.add('error',
        'Failed to register with the network. Please try again later.');
    }).then(function() {
      self.generating = false;
      self.registering = false;
      $scope.$apply();
    });
  };

  self.togglePolyfill = function() {
    self.display.polyfill = !self.display.polyfill;
  };

  /**
   * Decrements the number of seconds left for registration.
   */
  function _updateSecondsLeft() {
    // update the timer every second
    if(self.secondsLeft > 1) {
      $timeout(_updateSecondsLeft, 1000);
    }
    self.secondsLeft -= 1;
    self.secondsLeft = Math.max(0, self.secondsLeft);
  }
}

return register;

});
