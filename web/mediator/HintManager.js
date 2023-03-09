/*!
 * New BSD License (3-clause)
 * Copyright (c) 2017-2023, Digital Bazaar, Inc.
 * All rights reserved.
 */
import {getOriginName} from './helpers.js';
import {getWebAppManifest} from './manifest.js';
import {getWebAppManifestIcon} from 'vue-web-request-mediator';

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

    let matchingRegistrations;
    let recommendedHandlerOrigins;
    if(credentialRequestOptions) {
      // get matching registrations from request options
      matchingRegistrations = await navigator.credentialMediator.ui
        .matchCredentialRequest(credentialRequestOptions);
      ({web: {recommendedHandlerOrigins = []}} = credentialRequestOptions);
    } else if(credential) {
      // get registrations that match credential
      matchingRegistrations = await navigator.credentialMediator.ui
        .matchCredential(credential);
      ({options: {recommendedHandlerOrigins = []} = {}} = credential);
    } else {
      // nothing to match against to get hint options
      return [];
    }

    // only allow registration option per origin
    const registrationMap = new Map();
    for(const registration of matchingRegistrations) {
      const {credentialHandler} = registration;
      const {origin} = new URL(credentialHandler);
      if(!registrationMap.has(origin)) {
        registrationMap.set(origin, registration);
      }
    }
    const registrations = [...registrationMap.values()];
    const registeredOrigins = [...registrationMap.keys()];

    // get both non-JIT and JIT hint options
    const [nonJitHints, jitHints] = await Promise.all([
      _createRegisteredHints({registrations, credential}),
      _createRecommendedHints({
        recommendedHandlerOrigins, registeredOrigins,
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

  static async autoRegisterHint({hint}) {
    const {
      hintOption: {credentialHandler},
      manifest: {credential_handler: {enabledTypes, protocol}},
      name
    } = hint;
    await navigator.credentialMediator.ui.registerCredentialHandler(
      credentialHandler, {name, enabledTypes, icons: [], protocol});
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
    const {credentialHandler, enabledTypes, protocol} = handlerInfo;
    return _createHintOption({credentialHandler, enabledTypes, protocol});
  }
}

function _createHint({
  credentialHandler, host, origin, manifest, recommendedBy, handlerInfo
}) {
  const name = getOriginName({origin, manifest});
  let icon = getWebAppManifestIcon({manifest, origin, size: 32});
  if(icon) {
    icon = {fetchedImage: icon.src};
  }
  const hint = {
    name, icon, origin, host, manifest,
    hintOption: _createHintOption({name, credentialHandler, handlerInfo})
  };
  if(recommendedBy) {
    hint.jit = {recommendedBy};
  }
  return hint;
}

function _createHintOption({name, credentialHandler, handlerInfo}) {
  const {enabledTypes, protocol} = handlerInfo;
  const hintOption = {
    credentialHandler,
    credentialHint: {name, enabledTypes, icons: [], protocol},
    credentialHintKey: 'default'
  };
  return hintOption;
}

async function _createJitHint({
  recommendedOrigin, recommendedBy, acceptedTypes, credential
}) {
  if(typeof recommendedOrigin !== 'string') {
    return;
  }

  try {
    const {host, origin} = new URL(recommendedOrigin);
    const manifest = await getWebAppManifest({origin});
    if(manifest === null) {
      // manifest must be present to use recommended origin
      return;
    }

    // get handler info from manifest
    const handlerInfo = _getManifestCredentialHandlerInfo({manifest, origin});
    const {credentialHandler, enabledTypes, protocol} = handlerInfo;

    // if a `credential` is to be stored, exclude any handlers that receive
    // input via the `url` as some credentials are too large to send through
    if(credential && protocol?.input === 'url') {
      return;
    }

    // see if manifest expressed types match request/credential type
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
      {credentialHandler, host, origin, manifest, recommendedBy, handlerInfo});
  } catch(e) {
    console.warn(e);
    return;
  }
}

async function _createJitHints({
  recommendedHandlerOrigins, acceptedTypes,
  credential, credentialRequestOrigin, credentialRequestOriginManifest
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
  return Promise.all(recommendedHandlerOrigins.map(
    async recommendedOrigin => _createJitHint(
      {recommendedOrigin, recommendedBy, acceptedTypes, credential})));
}

async function _createRecommendedHints({
  recommendedHandlerOrigins, registeredOrigins,
  credentialRequestOptions, credential,
  credentialRequestOrigin, credentialRequestOriginManifest
}) {
  if(!Array.isArray(recommendedHandlerOrigins)) {
    return [];
  }

  // filter out any recommended handler origins that are already registered
  recommendedHandlerOrigins = recommendedHandlerOrigins.filter(
    // a recommended handler origin must not match any registered origin
    recommendedOrigin => !registeredOrigins.some(
      registeredOrigin => recommendedOrigin.startsWith(registeredOrigin)));
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
  /* Note: If `credential` is defined, credential handlers that only support
  receiving input via a URL will not be used (due to the potential for size
  limitations and a need for predictably consistent behavior). This creates a
  conflict with how N recommended handler origins are selected: the current
  implementation here will only allow the top three options from the list to
  possibly become hints for user selection, even if some of those three end up
  being filtered out. Ideally, if any of those three get filtered out more
  options could be checked, however, checking whether to filter an option
  involves fetching its Web app manifest. So either we fetch chunks of Web app
  manifests in parallel or we potentially fetch too many in parallel creating a
  possibility for bad UX. Right now we just rely on sites only recommending a
  maximum of three handlers anyway until we have a better fix for this. */
  const unfilteredHints = await _createJitHints({
    recommendedHandlerOrigins, acceptedTypes,
    credential, credentialRequestOrigin, credentialRequestOriginManifest
  });
  return unfilteredHints.filter(e => !!e);
}

async function _createRegisteredHint({registration, credential}) {
  let {credentialHandler} = registration;
  const {origin, host} = new URL(credentialHandler);
  const manifest = await getWebAppManifest({origin});

  let handlerInfo;
  try {
    handlerInfo = _getManifestCredentialHandlerInfo({manifest, origin});
    const {credentialHandler: newCredentialHandler} = handlerInfo;
    credentialHandler = newCredentialHandler;
  } catch(e) {
    // FIXME: if `manifest` is not `null` (perhaps a temporary failure to fetch
    // it), then manifest entry is invalid, and permission should be revoked
    // for the handler; change to `console.error` in that case
    console.warn(e);
  }

  // if a `credential` is to be stored, exclude any handlers that receive
  // input via the `url` as some credentials are too large to send through
  if(credential && handlerInfo.protocol?.input === 'url') {
    return;
  }

  const hint = _createHint(
    {credentialHandler, host, origin, manifest, handlerInfo});

  // re-register credential handler if required
  if(_mustRegister({registration, hintOption: hint.hintOption})) {
    const {enabledTypes, protocol} = handlerInfo;
    await navigator.credentialMediator.ui.registerCredentialHandler(
      credentialHandler,
      {name: hint.name, enabledTypes, icons: [], protocol});
  }

  return hint;
}

async function _createRegisteredHints({registrations, credential}) {
  const unfilteredHints = await Promise.all(registrations.map(
    registration => _createRegisteredHint({registration, credential})));
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
  // optional `protocol` entry
  const {credential_handler: {protocol}} = manifest;
  if(protocol) {
    if(typeof protocol !== 'object') {
      throw new Error(
        'If present, "credential_handler.protocol" must be an object in Web ' +
        `app manifest for origin "${origin}".`);
    }
    if(protocol.input) {
      if(!(protocol.input === 'url' || protocol.input === 'event')) {
        throw new Error(
          'If present, "credential_handler.protocol.input" must be either ' +
          `"url" or "event" in app manifest for origin "${origin}".`);
      }
    }
  }
  const {credential_handler: {url, enabledTypes}} = manifest;
  const credentialHandler = new URL(url, origin).href;
  return {credentialHandler, enabledTypes, protocol};
}

function _mustRegister({registration, hintOption}) {
  // re-register if credential handler changed
  if(registration.credentialHandler !== hintOption.credentialHandler) {
    return true;
  }

  // re-register if enabled types changed
  const {credentialHint: hint1} = registration;
  const {credentialHint: hint2} = hintOption;
  if(hint1?.enabledTypes.length !== hint2?.enabledTypes.length) {
    return true;
  }
  if(hint1.enabledTypes) {
    const types1 = hint1.enabledTypes.slice().sort();
    const types2 = hint2.enabledTypes.slice().sort();
    if(types1.some((t1, i1) => t1 !== types2[i1])) {
      return true;
    }
  }

  // re-register if protocol changed
  if(hint1?.protocol?.input !== hint2?.protocol?.input) {
    return true;
  }

  return false;
}
