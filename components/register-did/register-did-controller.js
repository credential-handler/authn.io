define([], function() {

'use strict';

/* @ngInject */
function factory(
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
    // TODO: is this check necessary or is it prevented by other mechanisms?
    if(!$scope.regForm.$valid) {
      return;
    }
    $scope.$on('identityService.register.progress', function(e, data) {
      self.generating = false;
      self.registering = true;
      self.secondsLeft = data.secondsLeft;
      $timeout(_updateSecondsLeft, 1000);
    });
    self.generating = true;
    aioIdentityService.register({
      identifier: self.email,
      password: self.passphrase,
      idp: self.idp,
      scope: $scope
    }).then(function(registrationInfo) {
      self.registering = false;
      var router = new navigator.credentials._Router(origin);
      router.send('registerDid', 'result', registrationInfo.didDocument);
    }).catch(function(err) {
      self.generating = false;
      self.registering = false;
      console.error('Failed to register with the network.', err);
      brAlertService.add('error',
        'Failed to register with the network. Please try a different email ' +
        'address and passphrase.');
    }).then(function() {
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

return {aioRegisterDidController: factory};

});
