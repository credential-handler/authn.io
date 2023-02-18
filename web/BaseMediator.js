/*!
 * New BSD License (3-clause)
 * Copyright (c) 2017-2023, Digital Bazaar, Inc.
 * All rights reserved.
 */
export class BaseMediator {
  constructor() {
    this.registrationHintOption = null;
    this.selectedHint = null;
    this.hintManager = null;
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
}
