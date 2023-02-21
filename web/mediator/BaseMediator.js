/*!
 * New BSD License (3-clause)
 * Copyright (c) 2017-2023, Digital Bazaar, Inc.
 * All rights reserved.
 */
import {HintManager} from './HintManager.js';
import {WebShareHandler} from './WebShareHandler.js';

export class BaseMediator {
  constructor() {
    this.credential = null;
    this.credentialRequestOptions = null;
    this.credentialRequestOrigin = null;
    this.credentialRequestOriginManifestPromise = null;
    this.registrationHintOption = null;
    this.selectedHint = null;
    this.hintManager = null;
    this.webShareHandler = null;

    // core UI hooks
    this.hide = null;
    this.ready = null;
    this.show = null;
  }

  async allowCredentialHandler() {
    const {
      registrationHintOption: {
        credentialHandler, credentialHintKey, enabledTypes
      }
    } = this;
    const hint = {name: credentialHintKey, enabledTypes};
    await navigator.credentialMediator.ui.registerCredentialHandler(
      credentialHandler, hint);
  }

  async getWebShareHandler() {
    if(this.webShareHandler) {
      return this.webShareHandler;
    }
    const handler = new WebShareHandler();
    const {
      credential, credentialRequestOptions, credentialRequestOrigin
    } = this;
    await handler.initialize(
      {credential, credentialRequestOptions, credentialRequestOrigin});
    this.webShareHandler = handler;
    return handler;
  }

  async selectHint({hint}) {
    this.selectedHint = hint;

    // auto-register handler if hint was JIT-created
    if(hint.jit) {
      await HintManager.autoRegisterHint({hint});
    }
  }

  startNewRequest() {
    this.hintManager = new HintManager();
    this.selectedHint = null;
    this.webShareHandler = null;
  }

  async webShare() {
    const handler = await this.getWebShareHandler();
    if(!handler.enabled) {
      console.log('WebShare not available on this platform.');
      return false;
    }
    await handler.share();
    return false;
  }
}
