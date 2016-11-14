/*!
 * New BSD License (3-clause)
 * Copyright (c) 2015-2016, Digital Bazaar, Inc.
 * Copyright (c) 2015-2016, Accreditrust Technologies, LLC
 * All rights reserved.
 */
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
