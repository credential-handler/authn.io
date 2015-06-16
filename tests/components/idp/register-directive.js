define([], function() {
  'use strict';
  var deps = [];
  return {aioMatchesInput: deps.concat(factory)};

  function factory() {
    return {
      restrict: 'A',
      require: 'ngModel',
      link: function(scope, elem, attrs, ctrl) {
        var me = attrs.ngModel;
        var matchTo = attrs.aioMatchesInput;
        scope.$watchGroup([me, matchTo], function(value) {
          ctrl.$setValidity('inputMatch', value[0] === value[1]);
        });
      }
    }
  }
});
