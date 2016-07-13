define([], function() {

'use strict';

function register(module) {
  module.component('aioRegisterDid', {
    controller: Ctrl,
    templateUrl: requirejs.toUrl(
      'authio/register-did/register-did-component.html')
  });
}

/* @ngInject */
function Ctrl(
  $location, $scope, $timeout,
  aioIdentityService, aioOperationService, brAlertService) {
  var self = this;
  self.email = '';
  self.passphraseConfirmation = '';
  self.passphrase = '';
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

    // first check to see if requested email+password already stored locally
    aioIdentityService.load({
      identifier: self.email,
      password: self.passphrase,
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
            return null;
          });
      }
      return null;
    }).then(function(registrationInfo) {
      if(registrationInfo) {
        // TODO: show a message indicating that an existing identity
        // was reused ... or give user option to create a new one?
        // already registered
        return registrationInfo;
      }

      return aioIdentityService.register({
        identifier: self.email,
        password: self.passphrase,
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
        'Failed to register with the network. Please try a different email ' +
        'address and passphrase.');
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
  }
}

return register;

});
