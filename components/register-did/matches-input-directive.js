/*!
 * New BSD License (3-clause)
 * Copyright (c) 2015-2016, Digital Bazaar, Inc.
 * Copyright (c) 2015-2016, Accreditrust Technologies, LLC
 * All rights reserved.
 */
define([], function() {

'use strict';

function register(module) {
  module.directive('aioMatchesInput', factory);
}

/* @ngInject */
function factory() {
  return {
    restrict: 'A',
    require: 'ngModel',
    link: function(scope, element, attrs, ctrl) {
      var me = attrs.ngModel;
      var matchTo = attrs.aioMatchesInput;
      scope.$watchGroup([me, matchTo], function(value) {
        ctrl.$setValidity('inputMatch', value[0] === value[1]);
      });
    }
  };
}

return register;

});
