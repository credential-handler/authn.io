/*!
 * New BSD License (3-clause)
 * Copyright (c) 2017-2023, Digital Bazaar, Inc.
 * All rights reserved.
 */
export class WebShareHandler {
  constructor() {
    this._data = null;
    this._resolveEnabled = null;
    this.enabled = new Promise(resolve => this._resolveEnabled = resolve);
  }

  async initialize({
    credential, credentialRequestOptions, credentialRequestOrigin
  } = {}) {
    if(!(navigator.canShare && navigator.share)) {
      this._resolveEnabled(false);
      return;
    }

    const data = _createWebShareData({
      credential, credentialRequestOptions, credentialRequestOrigin
    });

    if(!navigator.canShare({files: data.files})) {
      this._resolveEnabled(false);
      return;
    }

    this.data = data;
    this._resolveEnabled(true);
  }

  async share() {
    try {
      const result = await navigator.share(this.data);
      console.log('WebShare result', result);
    } catch(e) {
      console.error('WebShare error', e);
      throw e;
    }
  }
}

function _createWebShareData({
  credential, credentialRequestOptions, credentialRequestOrigin
}) {
  const payload = {credentialRequestOrigin};
  if(credential) {
    payload.credential = credential;
  }
  if(credentialRequestOptions) {
    // only include `web` options
    payload.credentialRequestOptions = {
      web: credentialRequestOptions.web
    };
  }
  const blob = new Blob(
    [JSON.stringify(payload, null, 2)],
    {type: 'text/plain'});
  const file = new File([blob], 'SharedCredentialRequest.txt',
    {type: 'text/plain'});

  const data = {
    title: 'Credential Offer',
    text: 'Choose a wallet to process this offer.',
    files: [file]
  };
  return data;
}
