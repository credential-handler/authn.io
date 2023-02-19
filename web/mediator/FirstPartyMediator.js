/*!
 * New BSD License (3-clause)
 * Copyright (c) 2017-2023, Digital Bazaar, Inc.
 * All rights reserved.
 */
import {autoRegisterHint} from './helpers.js';
import {BaseMediator} from './BaseMediator.js';
import {CredentialEventProxy} from './CredentialEventProxy.js';
import {loadOnce} from 'credential-mediator-polyfill';
import {PermissionManager} from 'credential-mediator-polyfill';

export class FirstPartyMediator extends BaseMediator {
  constructor() {
    super();
  }

  async initialize({show, hide, ready} = {}) {
    // enable getting credential request origin asynchronously
    let deferredGetCredentialRequestOrigin;
    const credentialRequestOriginPromise = new Promise((resolve, reject) => {
      deferredGetCredentialRequestOrigin = {resolve, reject};
    });

    try {
      this.show = show;
      this.hide = hide;
      this.ready = ready;

      // this mediator instance is loaded in a 1p context that communicates
      // with the mediator instance in the 3p context; create an event proxy to
      // receive events from the 3p context
      const proxy = new CredentialEventProxy();
      const rpcServices = proxy.createServiceDescription();

      await loadOnce({
        credentialRequestOrigin: credentialRequestOriginPromise,
        // these are not supported in a 1p mediator; they are only used in a
        // 3p mediator
        requestPermission: throwNotSupportedError,
        getCredential: throwNotSupportedError,
        storeCredential: throwNotSupportedError,
        getCredentialHandlerInjector: throwNotSupportedError,
        rpcServices
      });

      // receive proxied event from mediator in 3p context
      this.proxiedEvent = await proxy.receive();
      const {
        type,
        credential,
        credentialRequestOptions,
        credentialRequestOrigin,
        credentialRequestOriginManifest,
        registrationHintOption
      } = this.proxiedEvent;
      this.credential = credential;
      this.credentialRequestOptions = credentialRequestOptions;
      this.credentialRequestOrigin = credentialRequestOrigin;
      this.credentialRequestOriginManifestPromise =
        Promise.resolve(credentialRequestOriginManifest);
      this.registrationHintOption = registrationHintOption;
      deferredGetCredentialRequestOrigin.resolve(credentialRequestOrigin);

      this.startNewRequest();

      const needsHintSelection = type === 'selectcredentialhint';
      const requestType = needsHintSelection ?
        (credential ? 'credentialStore' : 'credentialRequest') :
        'requestPermission';
      await this.show({requestType});
      if(needsHintSelection) {
        await this.hintManager.initialize({
          credential, credentialRequestOptions,
          credentialRequestOrigin,
          credentialRequestOriginManifestPromise:
            this.credentialRequestOriginManifestPromise
        });
      }
      await this.ready();
    } catch(e) {
      deferredGetCredentialRequestOrigin.reject(e);
      throw e;
    }
  }

  async allowCredentialHandler() {
    await super.allowCredentialHandler();
    const status = {state: 'granted'};
    this.proxiedEvent.respondWith({status});
    await this.hide();
  }

  async denyCredentialHandler() {
    const status = {state: 'denied'};
    try {
      // set permission directly via permission manager
      const {credentialRequestOrigin} = this;
      const pm = new PermissionManager(
        credentialRequestOrigin, {request: () => status});
      pm._registerPermission('credentialhandler');
      await pm.request({name: 'credentialhandler'});
    } catch(e) {
      console.error(e);
    }
    this.proxiedEvent.respondWith({status});
    await this.hide();
  }

  async selectHint({hint}) {
    // auto-register handler if hint was JIT-created
    if(hint.jit) {
      await autoRegisterHint({hint});
    }
    this.proxiedEvent.respondWith({choice: {hint}});
  }
}

async function throwNotSupportedError() {
  const error = new Error('The operation is not supported.');
  error.name = 'NotSupportedError';
  return error;
}
