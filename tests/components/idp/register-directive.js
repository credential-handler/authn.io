define([], function() {

'use strict';

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

return {aioMatchesInput: factory};

});
