/*!
 * New BSD License (3-clause)
 * Copyright (c) 2017-2026 Digital Bazaar, Inc.
 */
import {utils} from 'web-request-rpc';

import {CredentialHandlersService} from './CredentialHandlersService.js';
import {CredentialHintsService} from './CredentialHintsService.js';
import {CredentialsContainerService} from './CredentialsContainerService.js';
import {localforage} from './storage.js';
import {PermissionManager} from './PermissionManager.js';
import {WebRequestHandlersService} from './WebRequestHandlersService.js';
import {WebRequestMediator} from './WebRequestMediator.js';

export {PermissionManager};

let loaded;
export async function loadOnce(options) {
  if(loaded) {
    return loaded;
  }
  loaded = load(options);
  return loaded;
}

// TODO: document
export async function load({
  // use `credentialRequestOrigin` as external name to eliminate confusion
  // over which origin the parameter refers to
  credentialRequestOrigin: relyingOrigin,
  requestPermission,
  getCredential,
  storeCredential,
  getCredentialHandlerInjector,
  rpcServices = {}
}) {
  /* If browser is a version of Chrome that has the Storage Access API, then
  its storage is partitioned for IndexedDB and localStorage, but not for
  cookies. Therefore, only the cookie driver is supported on that browser to
  enable an integrated experience. All other platforms have access to IndexedDB,
  localStorage, and cookie-based storage. Which is used will depend on the
  browser's specific capabilities and whether the mediator, when accessing
  storage, has been loaded in a first party or third party context. */
  let isChrome;
  try {
    isChrome = navigator.userAgentData &&
      navigator.userAgentData.brands.some(
        ({brand}) => brand === 'Google Chrome');
  } catch {
    isChrome = false;
  }
  if(isChrome && typeof document.requestStorageAccess === 'function') {
    await localforage.setDriver(['cookieWrapper']);
  } else {
    await localforage.setDriver(
      ['asyncStorage', 'localStorageWrapper', 'cookieWrapper']);
  }

  // relying origin for the web request mediator is the origin of the opener
  // or parent window (value found in `document.referrer`)
  const {origin} = utils.parseUrl(document.referrer);
  const wrm = new WebRequestMediator(origin);

  // define custom server API
  const permissionManager = new PermissionManager(
    relyingOrigin, {request: requestPermission});
  permissionManager._registerPermission('credentialhandler');
  wrm.server.define('permissionManager', permissionManager);

  const credentialsContainerService = new CredentialsContainerService(
    relyingOrigin, {
      get: getCredential,
      store: storeCredential,
      getCredentialHandlerInjector
    });

  const credentialHandlersService = new CredentialHandlersService(
    relyingOrigin, {permissionManager});
  credentialHandlersService.addEventListener('unregister', async event => {
    if(event.requestType === 'credential') {
      event.waitUntil(
        CredentialHintsService._destroy(event.registration));
    }
  });

  wrm.server.define('credentialHandlers', credentialHandlersService);
  wrm.server.define('credentialsContainer', credentialsContainerService);
  wrm.server.define('credentialHints', new CredentialHintsService(
    relyingOrigin, {permissionManager}));
  for(const [serviceName, service] of Object.entries(rpcServices)) {
    wrm.server.define(serviceName, service);
  }

  // connect to relying origin
  await wrm.connect();

  // TODO: move to another file and/or move out of credentialsContainerService?
  wrm.ui = {
    async selectCredentialHint(selection) {
      return credentialsContainerService._selectCredentialHint(selection);
    },
    async cancelSelectCredentialHint() {
      return credentialsContainerService._cancelSelectCredentialHint();
    },
    async matchCredentialRequest(credentialRequestOptions) {
      // get all credential handler registrations
      const registrations = await WebRequestHandlersService
        ._getAllRegistrations('credential');

      // find all matching credential hints
      const promises = [];
      registrations.forEach(url => promises.push(
        CredentialHintsService._matchCredentialRequest(
          url, credentialRequestOptions)));
      return [].concat(...await Promise.all(promises));
    },
    async matchCredential(credential) {
      // get all credential handler registrations
      const registrations = await WebRequestHandlersService
        ._getAllRegistrations('credential');

      // find all matching credential hints
      const promises = [];
      registrations.forEach(url => promises.push(
        CredentialHintsService._matchCredential(url, credential)));
      return [].concat(...await Promise.all(promises));
    },
    async registerCredentialHandler(handlerUrl, hint) {
      // grant handler permission
      const {origin: relyingOrigin} = utils.parseUrl(handlerUrl);
      const pm = new PermissionManager(relyingOrigin, {request: _granted});
      pm._registerPermission('credentialhandler');
      await pm.request({name: 'credentialhandler'});

      // set registration
      const requestType = 'credential';
      handlerUrl = await WebRequestHandlersService._setRegistration(
        requestType, handlerUrl);

      // add default hint
      await CredentialHintsService._set(handlerUrl, 'default', hint);
    },
    async unregisterCredentialHandler(handlerUrl) {
      // remove handler permission
      const {origin: relyingOrigin} = utils.parseUrl(handlerUrl);
      const pm = new PermissionManager(relyingOrigin);
      pm._registerPermission('credentialhandler');
      await pm.revoke({name: 'credentialhandler'});

      // remove handler and its hint storage
      const requestType = 'credential';
      await WebRequestHandlersService._getHandlerStorage(
        requestType, relyingOrigin).removeItem(handlerUrl);
      await CredentialHintsService._destroy(handlerUrl);
    }
  };

  // TODO: exposed API TBD
  navigator.credentialMediator = wrm;
}

async function _granted() {
  return {state: 'granted'};
}
