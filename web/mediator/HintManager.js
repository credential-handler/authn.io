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
    this.hints = [];
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
      _createRegisteredHints({handlers}),
      _createRecommendedHints({
        recommendedHandlerOrigins, handlers,
        credentialRequestOptions, credential,
        credentialRequestOrigin, credentialRequestOriginManifest
      })
    ]);
    this.hints = nonJitHints.concat(jitHints);
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
    let handlerInfo;
    try {
      handlerInfo = _getManifestCredentialHandlerInfo({manifest, origin});
    } catch(e) {
      // manifest does not have valid credential handler info
      console.error(e);
      return null;
    }
    const {credentialHandler, enabledTypes} = handlerInfo;
    return _createHintOption({credentialHandler, enabledTypes});
  }
}

async function _createRegisteredHints({handlers}) {
  // FIXME: make map function this a helper function
  return Promise.all(handlers.map(async credentialHandler => {
    // FIXME: replace all `utils.parseUrl` with WHATWG `URL`
    const {origin, host} = utils.parseUrl(credentialHandler);
    const manifest = await getWebAppManifest({origin});
    const originalCredentialHandler = credentialHandler;

    let handlerInfo;
    try {
      handlerInfo = _getManifestCredentialHandlerInfo({manifest, origin});
      const {credentialHandler: newCredentialHandler} = handlerInfo;
      credentialHandler = newCredentialHandler;
    } catch(e) {
      // FIXME: if `manifest` is not `null`, then manifest entry is invalid,
      // and permission should be revoked for the handler
      console.error(e);
    }

    const hint = _createHint({credentialHandler, host, origin, manifest});
    // if credential handler has changed, update registration
    // FIXME: also re-register credential handler if enabled types have changed
    if(originalCredentialHandler !== credentialHandler) {
      const {enabledTypes} = handlerInfo;
      await navigator.credentialMediator.ui.registerCredentialHandler(
        credentialHandler, {name: hint.name, enabledTypes, icons: []});
    }
    return hint;
  }));
}

async function _createJitHint({
  recommendedOrigin, recommendedBy, acceptedTypes
}) {
  if(typeof recommendedOrigin !== 'string') {
    return;
  }
  const {host, origin} = utils.parseUrl(recommendedOrigin);
  const manifest = await getWebAppManifest({origin});

  let handlerInfo;
  try {
    handlerInfo = _getManifestCredentialHandlerInfo({manifest, origin});
  } catch(e) {
    // FIXME: if `manifest` is not `null`, then manifest entry is invalid,
    // and permission should be revoked for the handler
    console.error(e);
    return;
  }

  // see if manifest expressed types match request/credential type
  const {credentialHandler, enabledTypes} = handlerInfo;
  let match = false;
  for(const t of acceptedTypes) {
    if(enabledTypes.includes(t)) {
      match = true;
      break;
    }
  }
  if(!match) {
    // no match
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
  recommendedHandlerOrigins, acceptedTypes,
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
    _createJitHint({recommendedOrigin, recommendedBy, acceptedTypes})));
}

async function _createRecommendedHints({
  recommendedHandlerOrigins, handlers,
  credentialRequestOptions, credential,
  credentialRequestOrigin, credentialRequestOriginManifest
}) {
  if(!Array.isArray(recommendedHandlerOrigins)) {
    return [];
  }

  // filter out any recommended handler origins that are already in `handlers`
  recommendedHandlerOrigins = recommendedHandlerOrigins.filter(
    // if credential handler URL starts with a recommended
    // handler origin, skip it
    url => !handlers.some(h => h.startsWith(url)));
  if(recommendedHandlerOrigins.length === 0) {
    return [];
  }

  // get relevant accepted types to match against handler
  let acceptedTypes;
  if(credentialRequestOptions) {
    // types are all capitalized `{web: {Type1, Type2, ..., TypeN}}`; use this
    // to filter out any non-type parameters in the request
    acceptedTypes = Object.keys(credentialRequestOptions.web)
      .filter(k => k[0] === k.toUpperCase()[0]);
  } else {
    acceptedTypes = [credential.dataType];
  }

  // use a maximum of 3 recommended handlers
  recommendedHandlerOrigins = recommendedHandlerOrigins.slice(0, 3);
  const unfilteredHints = await _createJitHints({
    recommendedHandlerOrigins, acceptedTypes,
    credentialRequestOrigin, credentialRequestOriginManifest
  });
  return unfilteredHints.filter(e => !!e);
}

function _getManifestCredentialHandlerInfo({manifest, origin}) {
  if(!manifest) {
    throw new Error(`No Web app manifest for origin "${origin}".`);
  }
  if(typeof manifest.credential_handler !== 'object') {
    throw new Error(
      'Missing "credential_handler" object in Web app manifest for ' +
      `origin "${origin}".`);
  }
  if(typeof manifest.credential_handler.url !== 'string') {
    throw new Error(
      'Missing "credential_handler.url" string in Web app manifest for ' +
      `origin "${origin}".`);
  }
  if(!Array.isArray(manifest.credential_handler.enabledTypes)) {
    throw new Error(
      'Missing "credential_handler.enabledTypes" array in Web app manifest ' +
      `for origin "${origin}".`);
  }
  const {credential_handler: {url, enabledTypes}} = manifest;
  const credentialHandler = new URL(url, origin).href;
  return {credentialHandler, enabledTypes};
}
