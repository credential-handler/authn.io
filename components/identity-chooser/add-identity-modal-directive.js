define([], function() {

'use strict';

/* @ngInject */
function factory(aioIdentityService, brAlertService) {
  return {
    restrict: 'E',
    scope: {},
    require: '^stackable',
    templateUrl: requirejs.toUrl(
      'authio/identity-chooser/add-identity-modal.html'),
    link: Link
  };

  function Link(scope, element, attrs, stackable) {
    var model = scope.model = {};
    model.loading = false;
    model.generating = false;

    model.add = function() {
      brAlertService.clearFeedback();
      model.loading = true;
      model.generating = true;
      aioIdentityService.load({
        identifier: model.email,
        password: model.passphrase,
        temporary: !model.permanent
      }).then(function(identity) {
        // auto-authenticate
        aioIdentityService.authenticate(identity.id, model.passphrase)
        stackable.close(null, identity);
      }).catch(function(err) {
        if(err.type === 'MappingLookupFailed') {
          err = 'Identity not found. Please make sure your email address ' +
            'and passphrase are correct.';
        }
        brAlertService.add('error', err, {scope: scope});
      }).then(function() {
        model.loading = model.generating = false;
        scope.$apply();
      });
    };
  }
}

return {aioAddIdentityModal: factory};

});
