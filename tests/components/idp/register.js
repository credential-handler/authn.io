define([
  'angular',
  './credential-manager-controller',
  './form-library-service',
  './register-controller',
  './register-directive'
], function(
  angular,
  credentialManagerController,
  // TODO: remove formLibraryService
  formLibraryService,
  registerController,
  registerDirective) {

'use strict';

var module = angular.module('authio.register', ['ipCookie', 'bedrock.alert']);

module.controller(credentialManagerController);
module.service(formLibraryService);
module.controller(registerController);
module.directive(registerDirective);

});
