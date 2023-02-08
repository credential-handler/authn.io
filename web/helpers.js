/*!
 * New BSD License (3-clause)
 * Copyright (c) 2017-2023, Digital Bazaar, Inc.
 * All rights reserved.
 */
import {getWebAppManifest} from './manifest.js';
import {getWebAppManifestIcon} from 'vue-web-request-mediator';
import {utils, WebAppContext} from 'web-request-rpc';

// default popup handler width and height
const DEFAULT_HINT_CHOOSER_POPUP_WIDTH = 500;
const DEFAULT_HINT_CHOOSER_POPUP_HEIGHT = 400;

const DEFAULT_ALLOW_WALLET_POPUP_WIDTH = 500;
const DEFAULT_ALLOW_WALLET_POPUP_HEIGHT = 240;

export function createWebShareData({
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
  return {data};
}

export async function webShareHasFileSupport({data}) {
  // Check if WebShare API with files is supported
  if(navigator.canShare && navigator.canShare({files: data.files})) {
    console.log('WebShare API with files is supported, sharing...');
    navigator.share(data)
      .then(result => {
        console.log('result:', result);
      })
      .catch(err => {
        console.log('Error during WebShare:', err);
      });
  } else {
    console.log('Sharing files through WebShare API not supported.');
  }
}

export function parseUrl({url}) {
  const {origin} = utils.parseUrl(url);
  const {host} = utils.parseUrl(origin);

  return {origin, host};
}

export async function autoRegisterHint({event, credentialHandler}) {
  const {
    name, manifest: {credential_handler: {enabledTypes}}
  } = event.hint;
  await navigator.credentialMediator.ui.registerCredentialHandler(
    credentialHandler, {name, enabledTypes, icons: []});
}

export async function createHintOptions({handlers}) {
  return Promise.all(handlers.map(
    async credentialHandler => {
      const {origin, host} = utils.parseUrl(credentialHandler);
      const manifest = (await getWebAppManifest({host})) || {};
      const name = manifest.name || manifest.short_name || host;
      // if `manifest.credential_handler` is set, update registration
      // to use it if it doesn't match already
      // TODO: consider also updating if `enabledTypes` does not match
      if(manifest.credential_handler &&
        manifest.credential_handler.url &&
        manifest.credential_handler.enabledTypes) {
        const {url, enabledTypes} = manifest.credential_handler;
        let newCredentialHandler;
        // resolve credential handler URL
        try {
          newCredentialHandler = new URL(url, origin).href;
          if(newCredentialHandler !== credentialHandler) {
            credentialHandler = newCredentialHandler;
            await navigator.credentialMediator.ui.registerCredentialHandler(
              credentialHandler, {name, enabledTypes, icons: []});
          }
        } catch(e) {
          console.error(e);
        }
      }
      // get updated name and icons
      let icon = getWebAppManifestIcon({manifest, origin, size: 32});
      if(icon) {
        icon = {fetchedImage: icon.src};
      }
      return {
        name,
        icon,
        origin,
        host,
        manifest,
        hintOption: {
          credentialHandler,
          credentialHintKey: 'default'
        }
      };
    }));
}

export async function createJitHints({
  recommendedHandlerOrigins, types, relyingOriginName, relyingOrigin,
  relyingOriginManifest, relyingDomain
}) {
  return Promise.all(recommendedHandlerOrigins.map(async recommendedOrigin => {
    if(typeof recommendedOrigin !== 'string') {
      return;
    }
    const {host, origin} = utils.parseUrl(recommendedOrigin);
    const manifest = (await getWebAppManifest({host})) || {};
    const name = manifest.name || manifest.short_name || host;
    if(!(manifest.credential_handler &&
      manifest.credential_handler.url &&
      Array.isArray(manifest.credential_handler.enabledTypes))) {
      // manifest does not have credential handler info
      return;
    }
    // see if manifest expressed types match request/credential type
    let match = false;
    for(const t of types) {
      if(manifest.credential_handler.enabledTypes.includes(t)) {
        match = true;
        break;
      }
    }
    if(!match) {
      // no match
      return;
    }
    // create hint
    let icon = getWebAppManifestIcon({manifest, origin, size: 32});
    if(icon) {
      icon = {fetchedImage: icon.src};
    }
    // resolve credential handler URL
    let credentialHandler;
    try {
      credentialHandler = new URL(
        manifest.credential_handler.url, origin).href;
    } catch(e) {
      console.error(e);
      return;
    }
    return {
      name,
      icon,
      origin,
      host,
      manifest,
      hintOption: {
        credentialHandler,
        credentialHintKey: 'default'
      },
      jit: {
        recommendedBy: {
          name: relyingOriginName,
          origin: relyingOrigin,
          manifest: relyingOriginManifest,
          domain: relyingDomain
        }
      }
    };
  }));
}

// FIXME: rename to `openHintChooserWindow`?
export async function openCredentialHintWindow({
  url, credential, credentialRequestOptions, credentialRequestOrigin,
  credentialRequestOriginManifest
}) {
  // create WebAppContext to run WebApp and connect to windowClient
  const appContext = new WebAppContext();
  const windowReady = appContext.createWindow(url, {
    popup: true,
    // loading should be quick to same mediator site
    timeout: 30000,
    bounds: {
      width: DEFAULT_HINT_CHOOSER_POPUP_WIDTH,
      height: DEFAULT_HINT_CHOOSER_POPUP_HEIGHT
    }
  });

  // save reference to current first party window
  this._popupDialog = appContext.control.dialog;
  this.popupOpen = true;

  // provide access to injector inside dialog destroy in case the user closes
  // the dialog -- so we can abort awaiting `proxy.send`
  let injector = null;
  let aborted = false;
  const {dialog} = appContext.control;
  const abort = () => {
    aborted = true;
    if(injector) {
      injector.client.close();
    }
    dialog.removeEventListener('close', abort);
    this.popupOpen = false;
  };
  dialog.addEventListener('close', abort);

  // create proxy interface for making calls in WebApp
  injector = await windowReady;

  appContext.control.show();

  const proxy = injector.get('credentialEventProxy', {
    functions: [{name: 'send', options: {timeout: 0}}]
  });

  try {
    const {choice} = await proxy.send({
      type: 'selectcredentialhint',
      credentialRequestOptions,
      credentialRequestOrigin,
      credentialRequestOriginManifest,
      credential,
      hintKey: undefined
    });
    return {choice, appContext};
  } catch(e) {
    if(!aborted) {
      // unexpected error, log it
      console.error(e);
    }
    return {choice: null, appContext: null};
  }
}

export async function openAllowWalletWindow({
  url, credentialRequestOrigin, credentialRequestOriginManifest
}) {
  // create WebAppContext to run WebApp and connect to windowClient
  const appContext = new WebAppContext();
  const windowReady = appContext.createWindow(url, {
    popup: true,
    // loading should be quick to same mediator site
    timeout: 30000,
    bounds: {
      width: DEFAULT_ALLOW_WALLET_POPUP_WIDTH,
      height: DEFAULT_ALLOW_WALLET_POPUP_HEIGHT
    }
  });

  // save reference to current first party window
  this._popupDialog = appContext.control.dialog;
  this.popupOpen = true;

  // provide access to injector inside dialog destroy in case the user closes
  // the dialog -- so we can abort awaiting `proxy.send`
  let injector = null;
  let aborted = false;
  const {dialog} = appContext.control;
  const abort = () => {
    aborted = true;
    if(injector) {
      injector.client.close();
    }
    dialog.removeEventListener('close', abort);
    this.popupOpen = false;
  };
  dialog.addEventListener('close', abort);

  // create proxy interface for making calls in WebApp
  injector = await windowReady;

  appContext.control.show();

  const proxy = injector.get('credentialEventProxy', {
    functions: [{name: 'send', options: {timeout: 0}}]
  });

  try {
    const result = await proxy.send({
      type: 'allowcredentialhandler',
      credentialRequestOrigin,
      credentialRequestOriginManifest
    });
    if(result.error) {
      const error = new Error(result.error.message);
      error.name = result.error.name;
      throw error;
    }
    const {status} = result;
    return {status, appContext};
  } catch(e) {
    if(!aborted) {
      // unexpected error, log it
      console.error(e);
    }
    return {status: {state: 'denied'}, appContext: null};
  } finally {
    appContext.control.hide();
  }
}

export async function createDefaultHintOption({origin, manifest} = {}) {
  if(!(manifest && manifest.credential_handler &&
    manifest.credential_handler.url &&
    Array.isArray(manifest.credential_handler.enabledTypes))) {
    // manifest does not have credential handler info
    return null;
  }

  // resolve credential handler URL
  let credentialHandler;
  try {
    credentialHandler = new URL(manifest.credential_handler.url, origin).href;
  } catch(e) {
    console.error(e);
    return null;
  }

  return {
    credentialHandler,
    credentialHintKey: 'default',
    enabledTypes: manifest.credential_handler.enabledTypes
  };
}
