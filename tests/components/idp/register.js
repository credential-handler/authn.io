define([
  'angular',
  'forge/forge',
  'did-io',
  'node-uuid',
  './register-controller',
  './register-directive'
], function(angular, forge, didiojs, uuid, registerController, registerDirective) {

'use strict';

var module = angular.module('authio.register', ['bedrock.alert']);
var didio = didiojs({inject: {
  forge: forge,
  uuid: uuid
}});

module.controller(registerController);
module.directive(registerDirective);

});
