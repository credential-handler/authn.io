/*!
 * New BSD License (3-clause)
 * Copyright (c) 2017-2023, Digital Bazaar, Inc.
 * All rights reserved.
 */
import {loadHints} from './helpers.js';

export class BaseMediator {
  constructor() {
    // FIXME: refactor for common vars between 1p and 3p mediator instances
    this.credentialRequestOrigin = null;
    this.deferredCredentialOperation = null;
    this.firstPartyMode = true;
    this.hide = null;
    this.hintOptions = [];
    this.operationState = null;
    // FIXME: perhaps rename to firstPartyDialog
    this.popupDialog = null;
    this.proxiedEvent = null;
    this.ready = null;
    this.registrationHintOption = null;
    this.resolvePermissionRequest = null;
    this.relyingOrigin = null;
    this.relyingOriginManifestPromise = null;
    this.selectedHint = null;
    this.show = null;
  }

  async allowCredentialHandler() {
    const {registrationHintOption} = this;
    // FIXME: is this conditional even possible?
    if(!registrationHintOption) {
      // FIXME: if this is possible, we will need to return a different
      // value so that subclasses can deal with it
      console.error('no "registrationHintOption" should never happen');
      return this.denyCredentialHandler();
    }
    const {
      credentialHandler, credentialHintKey, enabledTypes
    } = registrationHintOption;
    const hint = {name: credentialHintKey, enabledTypes};
    await navigator.credentialMediator.ui.registerCredentialHandler(
      credentialHandler, hint);
  }

  // FIXME: is this 3p mediator only?
  async cancel() {
    if(this.selectedHint) {
      await this.cancelSelection();
    }
    await this.hide();
    if(this.deferredCredentialOperation) {
      this.deferredCredentialOperation.resolve(null);
    }
    await navigator.credentialMediator.hide();
  }

  async cancelSelection() {
    await navigator.credentialMediator.ui.cancelSelectCredentialHint();
  }

  async denyCredentialHandler() {
    // FIXME: remove this
    this.resolvePermissionRequest({state: 'denied'});
    await this.hide();
    await navigator.credentialMediator.hide();
  }

  // FIXME: audit / improve this
  async removeHint({hint} = {}) {
    const idx = this.hintOptions.indexOf(hint);
    this.hintOptions.splice(idx, 1);
    if(this.hintOptions.length === 0) {
      // FIXME: remove this / map to new implementation needs
      //this.loading = true;
    }
    try {
      await navigator.credentialMediator.ui.unregisterCredentialHandler(
        hint.hintOption.credentialHandler);
      if(this.hintOptions.length === 0) {
        // load hints again to use recommended handler origins if present
        // and include a slight delay to avoid flash of content
        await new Promise(r => setTimeout(r, 1000));
        await this.loadHints();
      }
    } catch(e) {
      console.error(e);
    } finally {
      // FIXME: remove this / map to new implementation needs
      //this.loading = false;
    }
  }

  // FIXME: better generalize, perhaps by passing in `relyingOrigin`, etc. or
  // making the variable names the same across 1p and 3p mediators
  async _loadHints() {
    const {
      operationState: {input: {credentialRequestOptions, credential}},
      relyingOrigin, relyingOriginManifestPromise
    } = this;
    const hintOptions = await loadHints({
      credentialRequestOptions, credential,
      relyingOrigin, relyingOriginManifest: await relyingOriginManifestPromise
    });
    // FIXME: handle case that operation changed while the hints were loading,
    // if that case still needs handling now
    this.hintOptions = hintOptions;
    return this.hintOptions;
  }
}
