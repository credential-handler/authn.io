define([
  'angular',
  './identity-chooser-directive',
  './add-identity-modal-directive'
], function(angular, identityChooserDirective, addIdentityModalDirective) {

'use strict';

var module = angular.module(
  'authio.identityChooser', ['authio.identity', 'bedrock.alert']);

module.directive(identityChooserDirective);
module.directive(addIdentityModalDirective);

return module.name;

});
