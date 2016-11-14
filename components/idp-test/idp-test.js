/*!
 * New BSD License (3-clause)
 * Copyright (c) 2015-2016, Digital Bazaar, Inc.
 * Copyright (c) 2015-2016, Accreditrust Technologies, LLC
 * All rights reserved.
 */
define([
  'angular',
  './idp-test-controller'
],
function(angular, idpTestController) {

'use strict';

var module = angular.module(
  'authio.idp-test', ['bedrock.alert', 'ipCookie']);

module.controller(idpTestController);

return module.name;

});
