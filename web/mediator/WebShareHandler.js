/*!
 * New BSD License (3-clause)
 * Copyright (c) 2017-2023, Digital Bazaar, Inc.
 * All rights reserved.
 */
export class WebShareHandler {
  constructor() {
    this._data = null;
    this.enabled = false;
  }

  async initialize({
    credential, credentialRequestOptions, credentialRequestOrigin
  } = {}) {
    if(!(navigator.canShare && navigator.share)) {
      this.enabled = false;
      return;
    }

    const data = _createWebShareData({
      credential, credentialRequestOptions, credentialRequestOrigin
    });

    if(!navigator.canShare({files: data.files})) {
      this.enabled = false;
      return;
    }

    this._data = data;
    this.enabled = true;
  }

  async share() {
    try {
      const result = await navigator.share(this._data);
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
