/*!
 * New BSD License (3-clause)
 * Copyright (c) 2017-2026 Digital Bazaar, Inc.
 */
import {localforage} from './storage.js';

const VALID_PERMISSION_STATES = ['granted', 'denied', 'prompt'];

/* A PermissionManager for a Web Request Mediator. */
export class PermissionManager {
  constructor(relyingOrigin, {request = deny} = {}) {
    if(!(relyingOrigin && (typeof relyingOrigin === 'string' ||
      relyingOrigin.then))) {
      throw new TypeError(
        '"relyingOrigin" must be a non-empty string or a promise that ' +
        'resolves to one.');
    }
    if(typeof request !== 'function') {
      throw new TypeError('"request" must be a function.');
    }

    this._request = request;
    this.permissions = Promise.resolve(relyingOrigin)
      .then(relyingOrigin => {
        return localforage.createInstance({
          name: 'permission_' + relyingOrigin,
          driver: localforage.driver()
        });
      });
    // a list of supported permissions
    this.registry = [];
  }

  /**
   * Obtains the status of the given permission.
   *
   * @param {object} permissionDesc - A PermissionDescriptor containing the
   *   name of the permission to ask about
   *   (e.g. {name: 'permissionName'}).
   *
   * @returns {Promise<object>} Resolves to the PermissionStatus containing
   *   the state of the permission
   *   (e.g. {state: 'granted'/'denied'/'prompt'}).
   */
  async query(permissionDesc) {
    this._validatePermissionDescriptor(permissionDesc);

    try {
      const permissions = await this.permissions;
      const status = await permissions.getItem(permissionDesc.name);
      if(status) {
        return status;
      }
    } catch(e) {
      _throwIfNotNoStorageError(e);
    }

    // return default permission descriptor (state of `prompt`)
    return {
      state: 'prompt'
      // TODO: support `onchange` EventHandler
    };
  }

  /**
   * Requests that the user grant a permission to the current origin.
   *
   * @param {object} permissionDesc - A PermissionDescriptor containing the
   *   name of the permission to request
   *   (e.g. {name: 'permissionName'}).
   *
   * @returns {Promise<object>} Resolves to the PermissionStatus containing
   *   the new state of the permission
   *   (e.g. {state: 'granted'/'denied'}).
   */
  async request(permissionDesc) {
    // TODO: disallow more than one request at a time or pipeline them
    let status = await this.query(permissionDesc);
    if(status.state === 'prompt') {
      let storeStatus = status = await this._request(permissionDesc);
      this._validatePermissionStatus(status);
      // do not store `denied`, set to `prompt` so origin can ask later
      if(status.state === 'denied') {
        storeStatus = {state: 'prompt'};
      }
      // if state not already set, set it
      if(!status.set) {
        try {
          const permissions = await this.permissions;
          await permissions.setItem(permissionDesc.name, storeStatus);
        } catch(e) {
          _throwIfNotNoStorageError(e);
        }
      }
      // return clean status
      status = {state: status.state};
    }
    return status;
  }

  /**
   * Revokes a permission for the current origin.
   *
   * @param {object} permissionDesc - A PermissionDescriptor containing the
   *   name of the permission to revoke
   *   (e.g. {name: 'permissionName'}).
   *
   * @returns {Promise<object>} Resolves to the PermissionStatus containing
   *   the new state of the permission
   *   (e.g. {state: 'granted'/'denied'/'prompt'}).
   */
  async revoke(permissionDesc) {
    this._validatePermissionDescriptor(permissionDesc);
    try {
      // set permission status back to default, which is `prompt`
      const permissions = await this.permissions;
      await permissions.setItem(permissionDesc.name, {state: 'prompt'});
    } catch(e) {
      _throwIfNotNoStorageError(e);
    }
    // call `query` according to spec
    return this.query(permissionDesc);
  }

  /**
   * Registers a permission.
   *
   * @param {string} permissionName - The permission name.
   */
  _registerPermission(permissionName) {
    this.registry[permissionName] = true;
  }

  /**
   * Ensures a PermissionDescriptor is valid, throwing exceptions if not.
   *
   * @param {object} permissionDesc - The PermissionDescriptor to check.
   */
  _validatePermissionDescriptor(permissionDesc) {
    if(!(permissionDesc && typeof permissionDesc === 'object')) {
      throw new TypeError('"permissionDesc" must be an object.');
    }
    // TODO: support EventHandler `onchange` too
    if(typeof permissionDesc.name !== 'string') {
      throw new TypeError('"permissionDesc.name" must be a string.');
    }
    if(!this.registry[permissionDesc.name]) {
      throw new Error(`Unknown permission "${permissionDesc.name}".`);
    }
  }

  /**
   * Ensures a PermissionStatus is valid, throwing exceptions if not.
   *
   * @param {object} status - The PermissionStatus to check.
   */
  _validatePermissionStatus(status) {
    if(!(status && typeof status === 'object')) {
      throw new TypeError('Permission "status" must be an object.');
    }
    if(!(typeof status.state === 'string' &&
      VALID_PERMISSION_STATES.includes(status.state))) {
      throw new Error(`Invalid permission state "${status.state}".`);
    }
  }
}

async function deny() {
  return {state: 'denied'};
}

function _throwIfNotNoStorageError(error) {
  // ignore lack of storage in 3rd party context in some browsers; in those
  // browsers a first party dialog will be used to access storage
  if(!error.message.startsWith('No available storage')) {
    throw error;
  }
}
