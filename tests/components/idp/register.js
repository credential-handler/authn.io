define([
  'angular',
  'forge/forge',
  'did-io',
  'node-uuid',
  './credential-manager-controller',
  './register-controller',
  './register-directive'
], function(
  angular, forge, didiojs, uuid, registerController,
  credentialManagerController, registerDirective) {

'use strict';

var module = angular.module('authio.register', ['ipCookie', 'bedrock.alert']);
var didio = didiojs({inject: {
  forge: forge,
  uuid: uuid
}});

module.controller(registerController);
module.controller(credentialManagerController);
module.directive(registerDirective);

});
