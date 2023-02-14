/*!
 * New BSD License (3-clause)
 * Copyright (c) 2017-2023, Digital Bazaar, Inc.
 * All rights reserved.
 */
import {getWebAppManifest} from './manifest.js';
import {getWebAppManifestIcon} from 'vue-web-request-mediator';
import {utils} from 'web-request-rpc';

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

export function getOriginName({origin, manifest} = {}) {
  const {host} = parseUrl({url: origin});
  if(!manifest) {
    return host;
  }
  const {name, short_name} = manifest;
  return name || short_name || host;
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

export async function autoRegisterHint({hint}) {
  const {
    hintOption: {credentialHandler},
    manifest: {credential_handler: {enabledTypes}},
    name
  } = hint;
  await navigator.credentialMediator.ui.registerCredentialHandler(
    credentialHandler, {name, enabledTypes, icons: []});
}

export async function createHintOptions({handlers}) {
  return Promise.all(handlers.map(
    async credentialHandler => {
      const {origin, host} = utils.parseUrl(credentialHandler);
      const manifest = (await getWebAppManifest({origin})) || {};
      // FIXME: use `getOriginName()`
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
  recommendedHandlerOrigins, types, relyingOrigin, relyingOriginManifest
}) {
  const relyingOriginName = getOriginName(
    {origin: relyingOrigin, manifest: relyingOriginManifest});
  // FIXME: pass static helper function to .map()
  return Promise.all(recommendedHandlerOrigins.map(async recommendedOrigin => {
    if(typeof recommendedOrigin !== 'string') {
      return;
    }
    const {host, origin} = utils.parseUrl(recommendedOrigin);
    const manifest = (await getWebAppManifest({origin})) || {};
    // FIXME: use `getOriginName()`
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
          manifest: relyingOriginManifest
        }
      }
    };
  }));
}

// FIXME: move all hint helper functions to hint storage file
export async function loadHints({
  credentialRequestOptions, credential, relyingOrigin, relyingOriginManifest
} = {}) {
  let hintOptions;
  let recommendedHandlerOrigins;
  if(credentialRequestOptions) {
    // get matching hints from request options
    hintOptions = await navigator.credentialMediator.ui
      .matchCredentialRequest(credentialRequestOptions);
    ({web: {recommendedHandlerOrigins = []}} = credentialRequestOptions);
  } else if(credential) {
    // get hints that match credential
    hintOptions = await navigator.credentialMediator.ui
      .matchCredential(credential);
    ({options: {recommendedHandlerOrigins = []} = {}} = credential);
  }

  // get unique credential handlers
  const handlers = [...new Set(hintOptions.map(
    ({credentialHandler}) => credentialHandler))];
  const hintOptionsPromise = createHintOptions({handlers});

  // add any recommended options
  const jitHints = await _createRecommendedHints({
    recommendedHandlerOrigins, handlers,
    credentialRequestOptions, credential,
    relyingOrigin, relyingOriginManifest
  });

  hintOptions = await hintOptionsPromise;
  hintOptions.push(...jitHints);
  return hintOptions;
}

// FIXME: change to `createRegistrationHintOption` or similar
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

export async function _createRecommendedHints({
  recommendedHandlerOrigins, handlers,
  credentialRequestOptions, credential,
  relyingOrigin, relyingOriginManifest
}) {
  if(!Array.isArray(recommendedHandlerOrigins)) {
    return [];
  }

  // filter out any handlers that are already in `hintOptions`
  recommendedHandlerOrigins = recommendedHandlerOrigins.filter(
    // if credential handler URL starts with a recommended
    // handler origin, skip it
    url => !handlers.some(h => h.startsWith(url)));
  if(recommendedHandlerOrigins.length === 0) {
    return [];
  }

  // get relevant types to match against handler
  let types = [];
  if(credentialRequestOptions) {
    // types are all capitalized `{web: {Type1, Type2, ..., TypeN}}`
    types = Object.keys(credentialRequestOptions.web)
      .filter(k => k[0] === k.toUpperCase()[0]);
  } else {
    types.push(credential.dataType);
  }

  // use a maximum of 3 recommended handlers
  recommendedHandlerOrigins = recommendedHandlerOrigins.slice(0, 3);
  const unfilteredHints = await createJitHints({
    recommendedHandlerOrigins, types, relyingOrigin, relyingOriginManifest
  });
  return unfilteredHints.filter(e => !!e);
}
