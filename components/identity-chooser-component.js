/*!
 * New BSD License (3-clause)
 * Copyright (c) 2015-2017, Digital Bazaar, Inc.
 * Copyright (c) 2015-2017, Accreditrust Technologies, LLC
 * All rights reserved.
 */
/* global requirejs */
define(['angular'], function(angular) {

'use strict';

function register(module) {
  module.component('aioIdentityChooser', {
    bindings: {
      autoIdSelect: '<?aioAutoIdSelect',
      filter: '<?aioIdentityChooserFilter',
      enableRegistration: '<?aioEnableRegistration',
      onIdentitySelected: '&aioOnIdentitySelected'
    },
    controller: Ctrl,
    templateUrl: requirejs.toUrl('authio/identity-chooser-component.html')
  });
}

/* @ngInject */
function Ctrl($q, $timeout, aioIdentityService, aioUtilService) {
  var self = this;
  self.loading = true;
  self.selected = null;

  self.display = {};
  self.display.identityChooser = true;

  self.$onInit = function() {
    updateIdentities(self.filter);
    if(self.autoIdSelect) {
      var ids = Object.keys(self.identities);
      if(ids.length === 1) {
        return self.select(ids[0]);
      }
    }
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
    // allow authentication spinner to show
    $timeout(function() {
      try {
        aioIdentityService.authenticate(id, password);
      } catch(err) {
        if(err && typeof err === 'object' && err.message) {
          self.authenticationError = err.message;
        } else {
          self.authenticationError = 'There was a problem. Please try again.';
        }
        self.authenticating = false;
        return;
      }
      self.authenticating = false;
      self.select(id);
    });
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

  self.isAuthenticated = function(id) {
    return aioIdentityService.isAuthenticated(id, {
      cache: self.authenticatedCache
    });
  };

  function updateIdentities(filter) {
    self.authenticatedCache = {};

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
      $q.resolve(aioIdentityService.getDidDocument(id))
        .then(function(doc) {
          return aioIdentityService.getDidDocument(doc.idp);
        }).then(function(doc) {
          self.identities[id].sysRepoDomain =
            aioUtilService.parseDomain(doc.url);
          // TODO: check repo URL for a label to use instead of the domain
        }).catch(function() {
          self.identities[id].sysRepoDomain =
            'Error: Could not find repository domain.';
        });
    });
  }
}

return register;

});
