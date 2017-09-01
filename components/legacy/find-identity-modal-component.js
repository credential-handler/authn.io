/*!
 * New BSD License (3-clause)
 * Copyright (c) 2015-2017, Digital Bazaar, Inc.
 * Copyright (c) 2015-2017, Accreditrust Technologies, LLC
 * All rights reserved.
 */
export default {
  controller: Ctrl,
  require: {
    stackable: '^'
  },
  // TODO: add bindings w/aioOnAdd to return the identity instead
  // of passing via `stackable.close`?
  bindings: {
    onCustomRegistration: '&?aioOnCustomRegistration'
  },
  templateUrl: 'authio/legacy/find-identity-modal-component.html'
};

/* @ngInject */
function Ctrl($scope, aioIdentityService) {
  var self = this;
  self.loading = false;
  self.generating = false;
  self.error = null;

  self.add = function() {
    self.error = null;
    self.loading = true;
    self.generating = true;
    aioIdentityService.load({
      identifier: self.email,
      password: self.passphrase,
      temporary: !self.permanent,
      create: true
    }).then(function(identity) {
      if(!identity) {
        var err = new Error();
        err.type = 'Not Found';
        throw err;
      }
      // auto-authenticate
      aioIdentityService.authenticate(identity.id, self.passphrase);
      self.stackable.close(null, identity);
    }).catch(function(err) {
      if(err.type === 'NotFound' || err.type === 'MappingLookupFailed') {
        err = {
          message:
            'Wallet not found. Please make sure your email and ' +
            'password are correct.'
        };
      }
      self.error = err;
    }).then(function() {
      self.loading = self.generating = false;
      $scope.$apply();
    });
  };
}
