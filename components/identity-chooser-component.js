/*!
 * New BSD License (3-clause)
 * Copyright (c) 2015-2016, Digital Bazaar, Inc.
 * Copyright (c) 2015-2016, Accreditrust Technologies, LLC
 * All rights reserved.
 */
define(['angular'], function(angular) {

'use strict';

function register(module) {
  module.component('aioIdentityChooser', {
    bindings: {
      filter: '=?aioIdentityChooserFilter',
      onIdentitySelected: '&aioOnIdentitySelected'
    },
    controller: Ctrl,
    templateUrl: requirejs.toUrl('authio/identity-chooser-component.html')
  });
}

/* @ngInject */
function Ctrl($scope, aioIdentityService, aioOperationService, brAlertService) {
  var self = this;
  // TODO: `self.loading` needed? seems to only be used in synchronous code
  self.loading = true;
  self.authenticating = false;
  self.selected = null;

  self.display = {};
  self.display.identityChooser = true;

  self.$onInit = function() {
    updateIdentities(self.filter);
    self.loading = false;
  };

  self.$onChanges = function(changes) {
    if(changes.filter && !changes.filter.isFirstChange()) {
      updateIdentities(changes.filter.currentValue);
    }
  };

  self.identityAdded = function() {
    updateIdentities(self.filter);
  };

  self.authenticate = function(id, password) {
    self.authenticating = true;
    try {
      aioIdentityService.authenticate(id, password);
    } catch(err) {
      self.authenticating = false;
      brAlertService.add('error', err, {scope: $scope});
      $scope.$apply();
      return;
    }
    self.select(id);
    self.authenticating = false;
    $scope.$apply();
  };

  self.select = function(id) {
    if(self.selected === id && !aioIdentityService.isAuthenticated(id)) {
      // do nothing if the identity is already selected but not authenticated
      return;
    }
    // select new identity
    self.selected = id;
    if(aioIdentityService.isAuthenticated(id)) {
      // notify that the identity has been selected
      return self.onIdentitySelected({identity: id});
    }
    // clear password and show login form
    self.password = '';
    self.display.loginForm = true;
  };

  function updateIdentities(filter) {
    if(filter === null) {
      self.identities = aioIdentityService.identities.getAll();
    } else {
      var identity = aioIdentityService.identities.get(filter);
      self.identities = {};
      if(identity) {
        self.identities[identity.id] = identity;
      }
    }
    angular.forEach(self.identities, function(identity, id) {
      aioIdentityService.getDidDocument(id).then(function(doc) {
        return aioIdentityService.getDidDocument(doc.idp);
      }).then(function(doc) {
        self.identities[id].sysRepoDomain =
          aioOperationService.parseDomain(doc.url);
        // TODO: check repo URL for a label to use instead of the domain
      }).catch(function() {
        self.identities[id].sysRepoDomain =
          'Error: Could not find repository domain.';
      }).then(function() {
        $scope.$apply();
      });
    });
  }
}

return register;

});
