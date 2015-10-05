define([
  'angular',
  './identity-chooser-directive'
], function(angular, identityChooserDirective) {

'use strict';

var module = angular.module(
  'authio.identityChooser', ['authio.identity', 'bedrock.alert']);

module.directive(identityChooserDirective);

return module.name;

});
