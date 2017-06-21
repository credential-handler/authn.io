/*!
 * New BSD License (3-clause)
 * Copyright (c) 2015-2017, Digital Bazaar, Inc.
 * Copyright (c) 2015-2017, Accreditrust Technologies, LLC
 * All rights reserved.
 */
export default {
  controller: Ctrl,
  templateUrl: 'authio/register-component.html'
};

/* @ngInject */
function Ctrl(
  $location, $scope, $timeout, $window,
  aioIdentityService, aioPermissionService, aioUtilService,
  brAlertService) {
  var self = this;
  self.email = '';
  self.loading = false;
  self.generating = false;
  self.registering = false;
  self.userMediationRequired = false;

  // get register parameters
  self.loading = true;
  var origin = $location.search().origin;
  var router = new navigator.credentials._Router(origin);
  var params;
  router.request('registerDid', 'params').then(function(message) {
    self.domain = aioUtilService.parseDomain(message.origin);

    // TODO: handle other parameters
    params = message.data;
    self.idp = params.idp;
    if('name' in params) {
      self.email = params.name;
    }
    // user mediation required if register permission not granted for origin
    self.userMediationRequired = !aioPermissionService.isAuthorized(
      message.origin, 'register-identity-credential');
  }).catch(function(err) {
    brAlertService.add('error', err);
  }).then(function() {
    self.loading = false;
    $scope.$apply();
  }).then(function() {
    if(!self.userMediationRequired) {
      return self.onAllow(params.id);
    }
  });

  $window.document.addEventListener('keydown', function(e) {
    if(e.key === 'Escape' && e.target === $window.document.body) {
      self.onDeny();
    }
  });

  /**
   * Cancels registration.
   */
  self.onDeny = function() {
    var router = new navigator.credentials._Router(origin);
    router.send('registerDid', 'result', null);
  };

  /**
   * Allows registration to proceed.
   */
  self.onAllow = function() {
    // TODO: if `userMediationRequired` is false, can optimize away
    // progress events, etc.
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
    }).catch(function() {
      // ignore error, proceed with registration
    }).then(function(identity) {
      if(identity) {
        // get DID document to return as registration info
        return aioIdentityService.getDidDocument(identity.id)
          .then(function(didDocument) {
            return {didDocument: didDocument};
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
      var opts = {
        identifier: self.email,
        idp: self.idp,
        repositoryOrigin: origin,
        scope: $scope
      };
      if(params.id) {
        opts.id = params.id;
      }
      return aioIdentityService.register(opts);
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
