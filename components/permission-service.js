/*!
 * New BSD License (3-clause)
 * Copyright (c) 2017, Digital Bazaar, Inc.
 * Copyright (c) 2017, Accreditrust Technologies, LLC
 * All rights reserved.
 */
import _ from 'lodash';

/* @ngInject */
export default function factory() {
  var service = {};

  var STORAGE_KEYS = {
    AUTHORIZATIONS: 'authio.authorizations'
  };

  // known permissions
  var PERMISSIONS = {
    'register-identity-credential': {
      name: 'Register a digital wallet',
      icon: 'fa fa-id-card'
    }
  };

  // TODO: need a screen for permission revocation

  /**
   * Grants an origin a particular permission.
   *
   * @param origin the origin to authorize.
   * @param permissions the permission or permissions to grant.
   */
  service.allow = function(origin, permissions) {
    // TODO: better validation that `permissions` is a string/array of strings
    if(!Array.isArray(permissions)) {
      permissions = [permissions];
    }
    var authorizations = service.query();
    if(!(origin in authorizations)) {
      authorizations[origin] = {};
    }
    permissions.forEach(function(permission) {
      authorizations[origin][permission] = true;
    });
    setAuthorizations(authorizations);
  };

  /**
   * Blocks an origin from a particular permission.
   *
   * @param origin the origin to block.
   * @param permissions the permission or permissions to grant.
   */
  service.block = function(origin, permissions) {
    // TODO: better validation that `permissions` is a string/array of strings
    if(!Array.isArray(permissions)) {
      permissions = [permissions];
    }
    var authorizations = service.query();
    if(!(origin in authorizations)) {
      authorizations[origin] = {};
    }
    permissions.forEach(function(permission) {
      authorizations[origin][permission] = false;
    });
    setAuthorizations(authorizations);
  };

  /**
   * Resets an origin's permission to the default setting.
   *
   * @param origin the origin to reset.
   * @param permissions the permission or permissions to reset.
   */
  service.reset = function(origin, permissions) {
    // TODO: better validation that `permissions` is a string/array of strings
    if(!Array.isArray(permissions)) {
      permissions = [permissions];
    }
    var authorizations = service.query();
    if(origin in authorizations) {
      permissions.forEach(function(permission) {
        delete authorizations[origin][permission];
      });
      if(Object.keys(authorizations[origin]).length === 0) {
        delete authorizations[origin];
      }
      setAuthorizations(authorizations);
    }
  };

  /**
   * Queries authorization status. An empty query will return all
   * authorizations, keyed by origin. A query of {origin: 'foo'} will
   * return all authorizations for the origin `foo`.
   *
   * @param options the query options:
   *          [origin] the origin to get authorizations for.
   *          [granted] true to get only granted permissions as an array,
   *            false to get blocked permissions; must be coupled with
   *            `origin`.
   *
   * @return the result of the query.
   */
  service.query = function(options) {
    options = options || {};
    if(typeof options !== 'object') {
      throw new TypeError('`options` must be an object.');
    }
    var authorizations = localStorage.getItem(STORAGE_KEYS.AUTHORIZATIONS);
    if(authorizations) {
      try {
        authorizations = JSON.parse(authorizations);
      } catch(err) {
        console.error('Could not parse locally-stored authorizations.');
        // TODO: wiping out authorizations when they can't be parsed could be
        // very problematic, perhaps best to leave them alone any establish
        // new storage instead
        authorizations = {};
      }
    } else {
      authorizations = {};
    }
    if('origin' in options) {
      authorizations = authorizations[options.origin] || {};
      if('granted' in options) {
        return Object.keys(authorizations).filter(function(permission) {
          return authorizations[permission] === true;
        });
      }
      return authorizations;
    } else if('granted' in options) {
      throw new Error(
        '`options.origin` must be set when using `options.granted`.');
    }
    return authorizations;
  };

  /**
   * Checks to see if the given origin has been granted the given permissions.
   *
   * @param origin the origin to check.
   * @param permissions the permissions to check.
   *
   * @return true if all permissions have been granted, false if not.
   */
  service.isAuthorized = function(origin, permissions) {
    if(!Array.isArray(permissions)) {
      permissions = [permissions];
    }
    // get granted permissions for origin
    var granted = service.query({
      origin: origin,
      granted: true
    });
    return _.difference(permissions, granted).length === 0;
  };

  /**
   * Gets permission meta information including icon and name for display.
   *
   * @param permissions the permissions to get info for.
   *
   * @return a permission-id keyed map of permission meta info.
   */
  service.getMeta = function(permissions) {
    var meta = {};
    if(!Array.isArray(permissions)) {
      permissions = [permissions];
    }
    permissions.forEach(function(permission) {
      if(permission in PERMISSIONS) {
        meta[permission] = _.clone(PERMISSIONS[permission]);
      } else {
        throw new Error('Invalid permission `' + permission + '`.');
      }
    });
    return meta;
  };

  /**
   * Sets all authorizations.
   *
   * @param authorizations the authorizations map.
   */
  function setAuthorizations(authorizations) {
    localStorage.setItem(
      STORAGE_KEYS.AUTHORIZATIONS, JSON.stringify(authorizations));
  }

  return service;
}
