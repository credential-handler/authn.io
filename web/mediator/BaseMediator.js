/*!
 * New BSD License (3-clause)
 * Copyright (c) 2017-2023, Digital Bazaar, Inc.
 * All rights reserved.
 */
import {HintManager} from './HintManager.js';
import {WebShareHandler} from './WebShareHandler.js';

import {
  DEFAULT_HANDLER_POPUP_HEIGHT,
  DEFAULT_HANDLER_POPUP_WIDTH
} from './constants.js';

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
    // disable web share
    /*
    const {
      credential, credentialRequestOptions, credentialRequestOrigin
    } = this;
    await handler.initialize(
      {credential, credentialRequestOptions, credentialRequestOrigin});
    */
    this.webShareHandler = handler;
    return handler;
  }

  async selectHint({hint, allowHandlerPopup = true}) {
    if(this.selectedHint) {
      throw new Error('Hint already selected.');
    }
    this.selectedHint = hint;

    if(allowHandlerPopup) {
      // if the request is to be sent via URL, it must be done now to prevent
      // the popup from being blocked
      const {hintOption: {credentialHint: {acceptedInput}}} = hint;
      const sendRequestViaUrl = acceptedInput === 'url';
      if(sendRequestViaUrl) {
        await this._sendCredentialRequestViaUrl({hint});
      }
    }

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

  async _sendCredentialRequestViaUrl({hint}) {
    // build URL w/`request` param
    const {
      credentialHandler, credentialHint: {acceptedProtocols}
    } = hint.hintOption;
    const parsed = new URL(credentialHandler);
    const {
      credential,
      credentialRequestOptions,
      credentialRequestOrigin
    } = this;
    // send only accepted protocol URLs
    const rpProtocols = (credential?.options || credentialRequestOptions.web)
      ?.protocols || {};
    const protocols = {};
    for(const p in rpProtocols) {
      if(acceptedProtocols.includes(p)) {
        protocols[p] = rpProtocols[p];
      }
    }

    // FIXME: use gzip as well?
    const request = JSON.stringify({credentialRequestOrigin, protocols});
    parsed.searchParams.set('request', request);
    const url = parsed.toString();

    const width = Math.min(DEFAULT_HANDLER_POPUP_WIDTH, window.innerWidth);
    const height = Math.min(DEFAULT_HANDLER_POPUP_HEIGHT, window.innerHeight);
    const left = Math.floor(window.screenX + (window.innerWidth - width) / 2);
    const top = Math.floor(window.screenY + (window.innerHeight - height) / 2);
    const features =
      'popup=yes,menubar=no,scrollbars=no,status=no,noopener=yes,' +
      `width=${width},height=${height},left=${left},top=${top}`;
    window.open(url, '_blank', features);
  }
}
