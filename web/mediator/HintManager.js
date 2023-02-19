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
      _createHints({handlers}),
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

  static createHintOption({origin, manifest} = {}) {
    if(!(manifest && manifest.credential_handler &&
      manifest.credential_handler.url &&
      Array.isArray(manifest.credential_handler.enabledTypes))) {
      // manifest does not have credential handler info
      return null;
    }

    // resolve credential handler URL
    let credentialHandler;
    try {
      const {url} = manifest.credential_handler;
      credentialHandler = _resolveRelativeUrl({url, origin});
    } catch(e) {
      console.error(e);
      return null;
    }

    const {enabledTypes} = manifest.credential_handler;
    return _createHintOption({credentialHandler, enabledTypes});
  }
}

async function _createHints({handlers}) {
  // FIXME: make map function this a helper function
  return Promise.all(handlers.map(async credentialHandler => {
    // FIXME: replace all `utils.parseUrl` with WHATWG `URL`
    const {origin, host} = utils.parseUrl(credentialHandler);
    const manifest = await getWebAppManifest({origin});
    const originalCredentialHandler = credentialHandler;

    // FIXME: if `manifest.credential_handler` is NOT set, then permission
    // should be revoked for the handler
    // FIXME: make this a helper function; make DRY with static
    // `createHintOption` method above
    if(manifest && manifest.credential_handler &&
      manifest.credential_handler.url &&
      manifest.credential_handler.enabledTypes) {
      // resolve credential handler URL
      try {
        const {url} = manifest.credential_handler;
        credentialHandler = _resolveRelativeUrl({url, origin});
      } catch(e) {
        console.error(e);
      }
    }
    const hint = _createHint({credentialHandler, host, origin, manifest});
    // if credential handler has changed, update registration
    if(originalCredentialHandler !== credentialHandler) {
      // FIXME: also re-register credential handler if enabled types have
      // changed
      const {enabledTypes} = manifest.credential_handler;
      await navigator.credentialMediator.ui.registerCredentialHandler(
        credentialHandler, {name: hint.name, enabledTypes, icons: []});
    }
    return hint;
  }));
}

async function _createJitHint({recommendedOrigin, recommendedBy, types}) {
  if(typeof recommendedOrigin !== 'string') {
    return;
  }
  const {host, origin} = utils.parseUrl(recommendedOrigin);
  const manifest = await getWebAppManifest({origin});
  // FIXME: make validation of `manifest.credential_handler` more DRY
  if(!(manifest && manifest.credential_handler &&
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
  // resolve credential handler URL
  let credentialHandler;
  try {
    const {url} = manifest.credential_handler;
    credentialHandler = _resolveRelativeUrl({url, origin});
  } catch(e) {
    console.error(e);
    return;
  }
  return _createHint(
    {credentialHandler, host, origin, manifest, recommendedBy});
}

function _createHint({
  credentialHandler, host, origin, manifest, recommendedBy
}) {
  const name = getOriginName({origin, manifest});
  let icon = getWebAppManifestIcon({manifest, origin, size: 32});
  if(icon) {
    icon = {fetchedImage: icon.src};
  }
  const hint = {
    name, icon, origin, host, manifest,
    hintOption: _createHintOption({credentialHandler})
  };
  if(recommendedBy) {
    hint.jit = {recommendedBy};
  }
  return hint;
}

function _createHintOption({credentialHandler, enabledTypes}) {
  const hintOption = {credentialHandler, credentialHintKey: 'default'};
  if(enabledTypes) {
    hintOption.enabledTypes = enabledTypes;
  }
  return hintOption;
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
    // types are all capitalized `{web: {Type1, Type2, ..., TypeN}}`; use this
    // to filter out any non-type parameters in the request
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

function _resolveRelativeUrl({url, origin}) {
  return new URL(url, origin).href;
}
