define([], function() {

'use strict';

/* @ngInject */
function factory(aioIdentityService, brAlertService) {
  return {
    restrict: 'E',
    scope: {
      filter: '=?aioIdentityChooserFilter',
      callback: '&aioIdentityChooserCallback'
    },
    controller: function() {},
    controllerAs: 'ctrl',
    bindToController: true,
    link: Link,
    templateUrl: requirejs.toUrl(
      'authio/identity-chooser/identity-chooser.html')
  };

  function Link(scope, element, attrs, ctrl) {
    ctrl.loading = true;
    ctrl.selected = null;

    ctrl.display = {};
    ctrl.display.identityChooser = true;

    var init = false;
    scope.$watch(function() {
      return ctrl.filter;
    }, function(filter) {
      if(filter === undefined) {
        return;
      }
      updateIdentities(filter);
      if(!init) {
        ctrl.loading = false;
        init = true;
      }
    });

    ctrl.identityAdded = function() {
      updateIdentities(ctrl.filter);
    };

    ctrl.authenticate = function(id, password) {
      try {
        aioIdentityService.authenticate(id, password);
      } catch(err) {
        brAlertService.add('error', err, {scope: scope});
        return;
      }
      return ctrl.select(id);
    };

    ctrl.select = function(id) {
      if(ctrl.selected === id && !aioIdentityService.isAuthenticated(id)) {
        // do nothing if the identity is already selected
        return;
      }
      ctrl.selected = id;
      if(aioIdentityService.isAuthenticated(id)) {
        // no further user mediation required, generate session
        return aioIdentityService.createSession(id).then(function(session) {
          ctrl.callback({err: null, session: session});
        });
      }
      ctrl.display.loginForm = true;
    };

    function updateIdentities(filter) {
      if(filter === null) {
        ctrl.identities = aioIdentityService.identities.getAll();
      } else {
        var identity = aioIdentityService.identities.get(filter);
        ctrl.identities = {};
        if(identity) {
          ctrl.identities[identity.id] = identity;
        }
      }
    }
  }
}

return {aioIdentityChooser: factory};

});
