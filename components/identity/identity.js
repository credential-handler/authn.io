/*!
 * New BSD License (3-clause)
 * Copyright (c) 2015-2016, Digital Bazaar, Inc.
 * Copyright (c) 2015-2016, Accreditrust Technologies, LLC
 * All rights reserved.
 */
define([
  'angular',
  './identity-service'
], function(angular, identityService) {

'use strict';

var module = angular.module('authio.identity', []);

module.service(identityService);

});
