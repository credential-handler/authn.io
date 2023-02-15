/*!
 * New BSD License (3-clause)
 * Copyright (c) 2017-2023, Digital Bazaar, Inc.
 * All rights reserved.
 */
export class BaseMediator {
  constructor() {
    // FIXME: refactor for common vars between 1p and 3p mediator instances
    this.hintOptions = [];
    this.registrationHintOption = null;
    this.selectedHint = null;
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

  async removeHint({hint} = {}) {
    const idx = this.hintOptions.indexOf(hint);
    this.hintOptions.splice(idx, 1);
    try {
      await navigator.credentialMediator.ui.unregisterCredentialHandler(
        hint.hintOption.credentialHandler);
      if(this.hintOptions.length === 0) {
        // load hints again to use recommended handler origins if present
        // and include a slight delay to avoid flash of content
        await new Promise(r => setTimeout(r, 1000));
        await this._loadHints();
      }
    } catch(e) {
      console.error(e);
    }
  }

  // FIXME: better generalize so that `BaseMediator` can provide this function;
  // perhaps by passing in `relyingOrigin`, etc. or making the variable names
  // the same across 1p and 3p mediators
  async _loadHints() {
    console.log('base mediator _loadHints() called');
    throw new Error('not implemented');
  }
}
