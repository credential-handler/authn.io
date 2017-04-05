/*!
 * New BSD License (3-clause)
 * Copyright (c) 2015-2017, Digital Bazaar, Inc.
 * Copyright (c) 2015-2017, Accreditrust Technologies, LLC
 * All rights reserved.
 */
define([], function() {

'use strict';

function register(module) {
  module.service('aioUtilService', factory);
}

/* @ngInject */
function factory() {
  var service = {};

  /**
   * Parses out the origin for the given URL.
   *
   * @param url the URL to parse.
   *
   * @return the URL's origin.
   */
  service.parseOrigin = function(url) {
    // `URL` API not supported on IE, use DOM to parse URL
    var parser = document.createElement('a');
    parser.href = url;
    var origin = (parser.protocol || window.location.protocol) + '//';
    if(parser.host) {
      // use hostname when using default ports
      // (IE adds always adds port to `parser.host`)
      if((parser.protocol === 'http:' && parser.port === '80') ||
        (parser.protocol === 'https:' && parser.port === '443')) {
        origin += parser.hostname;
      } else {
        origin += parser.host;
      }
    } else {
      origin += window.location.host;
    }
    return origin;
  };

  /**
   * Parses out the domain for the given URL.
   *
   * @param url the URL to parse.
   *
   * @return the URL's domain.
   */
  service.parseDomain = function(url) {
    // `URL` API not supported on IE, use DOM to parse URL
    var parser = document.createElement('a');
    parser.href = url;
    if(parser.host) {
      // use hostname when using default ports
      // (IE adds always adds port to `parser.host`)
      if((parser.protocol === 'http:' && parser.port === '80') ||
        (parser.protocol === 'https:' && parser.port === '443')) {
        return parser.hostname;
      }
      return parser.host;
    }
    return window.location.host;
  };

  return service;
}

return register;

});
