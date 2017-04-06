/*!
 * New BSD License (3-clause)
 * Copyright (c) 2015-2017, Digital Bazaar, Inc.
 * Copyright (c) 2015-2017, Accreditrust Technologies, LLC
 * All rights reserved.
 */
/* global requirejs */
define([], function() {

'use strict';

function register(module) {
  module.component('aioFindIdentityModal', {
    controller: Ctrl,
    require: {
      stackable: '^'
    },
    // TODO: add bindings w/aioOnAdd to return the identity instead
    // of passing via `stackable.close`?
    bindings: {
      onCustomRegistration: '&?aioOnCustomRegistration',
    },
    templateUrl: requirejs.toUrl('authio/find-identity-modal-component.html')
  });
}

/* @ngInject */
function Ctrl($scope, aioIdentityService, brAlertService) {
  var self = this;
  self.loading = false;
  self.generating = false;

  self.add = function() {
    brAlertService.clearFeedback();
    self.loading = true;
    self.generating = true;
    aioIdentityService.load({
      identifier: self.email,
      password: self.passphrase,
      temporary: !self.permanent,
      create: true
    }).then(function(identity) {
      // auto-authenticate
      aioIdentityService.authenticate(identity.id, self.passphrase);
      self.stackable.close(null, identity);
    }).catch(function(err) {
      if(err.type === 'MappingLookupFailed') {
        err = 'Wallet not found. Please make sure your email address ' +
          'and passphrase are correct.';
      }
      brAlertService.add('error', err, {scope: $scope});
    }).then(function() {
      self.loading = self.generating = false;
      $scope.$apply();
    });
  };
}

return register;

});
