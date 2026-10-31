/*!
 * New BSD License (3-clause)
 * Copyright (c) 2017-2026 Digital Bazaar, Inc.
 */
import {utils} from 'web-request-rpc';
import {WebRequestHandlersService} from './WebRequestHandlersService.js';

/* Note: The credential handlers service has been deprecated for use by
credential handler developers. It is only used by the mediator internally now.
All previously public APIs have been converted into no-ops with console
warnings. */

export class CredentialHandlersService extends WebRequestHandlersService {
  constructor(relyingOrigin, {requestType, permissionManager} = {}) {
    super(relyingOrigin, {requestType, permissionManager});
  }

  async register(requestType, url) {
    this._deprecateNotice();
    // always return register as a no-op success for backwards compatiblity;
    // but it behaves as if it was immediately unregistered and the only APIs
    // on the registration are the deprecated no-op `hint` APIs
    url = _normalizeUrl(url, await this._relyingOrigin);
    return url;
  }

  async unregister() {
    this._deprecateNotice();
    return false;
  }

  async getRegistration() {
    this._deprecateNotice();
    return null;
  }

  async hasRegistration() {
    this._deprecateNotice();
    return false;
  }

  _deprecateNotice() {
    console.warn('Credential hints are deprecated and no longer used.');
  }
}

function _normalizeUrl(url, origin) {
  const parsed = utils.parseUrl(url, origin);
  if(parsed.origin !== origin) {
    throw new Error(`Url "${url}" must have an origin of "${origin}"`);
  }
  return parsed.origin + parsed.pathname;
}
