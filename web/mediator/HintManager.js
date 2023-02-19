/*!
 * New BSD License (3-clause)
 * Copyright (c) 2017-2023, Digital Bazaar, Inc.
 * All rights reserved.
 */
import {getOriginName} from './helpers.js';
import {getWebAppManifest} from './manifest.js';
import {getWebAppManifestIcon} from 'vue-web-request-mediator';
import {utils} from 'web-request-rpc';

export class HintManager {
  constructor() {
    this.credential = null;
    this.credentialRequestOptions = null;
    this.credentialRequestOrigin = null;
    this.credentialRequestOriginManifest = null;
    this.hintOptions = [];
  }

  async initialize({
    credential, credentialRequestOptions,
    credentialRequestOrigin, credentialRequestOriginManifestPromise
  } = {}) {
    this.credential = credential;
    this.credentialRequestOptions = credentialRequestOptions;
    this.credentialRequestOrigin = credentialRequestOrigin;
    this.credentialRequestOriginManifest =
      await credentialRequestOriginManifestPromise;
    await this.reload();
  }

  async reload() {
    const {
      credential,
      credentialRequestOptions,
      credentialRequestOrigin,
      credentialRequestOriginManifest
    } = this;

    let matchingHintOptions;
    let recommendedHandlerOrigins;
    if(credentialRequestOptions) {
      // get matching hints from request options
      matchingHintOptions = await navigator.credentialMediator.ui
        .matchCredentialRequest(credentialRequestOptions);
      ({web: {recommendedHandlerOrigins = []}} = credentialRequestOptions);
    } else if(credential) {
      // get hints that match credential
      matchingHintOptions = await navigator.credentialMediator.ui
        .matchCredential(credential);
      ({options: {recommendedHandlerOrigins = []} = {}} = credential);
    } else {
      // nothing to match against to get hint options
      return [];
    }

    // get unique credential handlers from matches
    const handlers = [...new Set(matchingHintOptions.map(
      ({credentialHandler}) => credentialHandler))];

    // get both non-JIT and JIT hint options
    const [nonJitHints, jitHints] = await Promise.all([
      _createHintOptions({handlers}),
      _createRecommendedHints({
        recommendedHandlerOrigins, handlers,
        credentialRequestOptions, credential,
        credentialRequestOrigin, credentialRequestOriginManifest
      })
    ]);
    this.hintOptions = nonJitHints.concat(jitHints);
  }

  async removeHint({hint} = {}) {
    const {hintOption: {credentialHandler}} = hint;
    await navigator.credentialMediator.ui.unregisterCredentialHandler(
      credentialHandler);
    // load hints again to use recommended handler origins if present
    // and include a minimum slight delay to avoid flash of content
    const timeout = new Promise(r => setTimeout(r, 500));
    await this.reload();
    await timeout;
  }
}

// FIXME: integrate below into above......

async function _createHintOptions({handlers}) {
  // FIXME: make map function this a helper function
  return Promise.all(handlers.map(async credentialHandler => {
    const {origin, host} = utils.parseUrl(credentialHandler);
    const manifest = (await getWebAppManifest({origin})) || {};
    // FIXME: use `getOriginName()`
    const name = manifest.name || manifest.short_name || host;
    // if `manifest.credential_handler` is set, update registration
    // to use it if it doesn't match already
    // TODO: consider also updating if `enabledTypes` does not match
    // FIXME: make this a helper function
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

    // FIXME: consolidate with JIT hint creation code below
    // get updated name and icons
    let icon = getWebAppManifestIcon({manifest, origin, size: 32});
    if(icon) {
      icon = {fetchedImage: icon.src};
    }
    return {
      name, icon, origin, host, manifest,
      hintOption: {credentialHandler, credentialHintKey: 'default'}
    };
  }));
}

async function _createJitHint({recommendedOrigin, recommendedBy, types}) {
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
    credentialHandler = new URL(manifest.credential_handler.url, origin).href;
  } catch(e) {
    console.error(e);
    return;
  }
  return {
    name, icon, origin, host, manifest,
    hintOption: {credentialHandler, credentialHintKey: 'default'},
    jit: {recommendedBy}
  };
}

async function _createJitHints({
  recommendedHandlerOrigins, types,
  credentialRequestOrigin, credentialRequestOriginManifest
}) {
  const credentialRequestOriginName = getOriginName({
    origin: credentialRequestOrigin,
    manifest: credentialRequestOriginManifest
  });
  const recommendedBy = {
    name: credentialRequestOriginName,
    origin: credentialRequestOrigin,
    manifest: credentialRequestOriginManifest
  };
  return Promise.all(recommendedHandlerOrigins.map(async recommendedOrigin =>
    _createJitHint({recommendedOrigin, recommendedBy, types})));
}

async function _createRecommendedHints({
  recommendedHandlerOrigins, handlers,
  credentialRequestOptions, credential,
  credentialRequestOrigin, credentialRequestOriginManifest
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
  const unfilteredHints = await _createJitHints({
    recommendedHandlerOrigins, types,
    credentialRequestOrigin, credentialRequestOriginManifest
  });
  return unfilteredHints.filter(e => !!e);
}
