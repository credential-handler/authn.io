/*!
 * Copyright (c) 2016 Digtal Bazaar, Inc. All rights reserved.
 */
define([], function() {

'use strict';

function register(module) {
  module.component('aioSplash', {
    bindings: {
      timeout: '<?aioTimeout',
      onTimeout: '&aioOnTimeout'
    },
    controller: Ctrl,
    templateUrl: requirejs.toUrl('authio/splash-component.html')
  });
}

/* @ngInject */
function Ctrl($timeout) {
  var self = this;
  self.show = true;
  // default timeout
  self.timeout = 2000;

  self.$onInit = function() {
    $timeout(function() {
      self.show = false;
      self.onTimeout();
    }, self.timeout);
  };
}

return register;

});
