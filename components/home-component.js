/*!
 * New BSD License (3-clause)
 * Copyright (c) 2017, Digital Bazaar, Inc.
 * All rights reserved.
 */
'use strict';

export default {
  controller: Ctrl,
  templateUrl: 'authio/home-component.html'
};

/* @ngInject */
function Ctrl($location) {
  // temporary redirect to legacy page
  $location.url('/legacy');
}
