/*!
 * Copyright (c) 2016 Digtal Bazaar, Inc. All rights reserved.
 */
define([], function() {

'use strict';

function register(module) {
  module.component('aioSplash', {
    templateUrl: requirejs.toUrl('authio/splash-component.html')
  });
}

return register;

});
