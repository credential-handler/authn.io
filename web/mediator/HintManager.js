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

    // get RP accepted protocols
    const rpProtocols = (credential?.options || credentialRequestOptions.web)
      ?.protocols || {};

    // get both non-JIT and JIT hint options
    const [nonJitHints, jitHints] = await Promise.all([
      _createRegisteredHints({registrations, rpProtocols}),
      _createRecommendedHints({
        recommendedHandlerOrigins, registeredOrigins,
        credential, credentialRequestOptions,
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
      manifest: {
        credential_handler: {enabledTypes, acceptedInput, acceptedProtocols}
      },
      name
    } = hint;
    await navigator.credentialMediator.ui.registerCredentialHandler(
      credentialHandler,
      {name, enabledTypes, icons: [], acceptedInput, acceptedProtocols});
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
    const name = getOriginName({origin, manifest});
    return _createHintOption({name, handlerInfo});
  }
}

function _createHint({host, origin, manifest, recommendedBy, handlerInfo}) {
  const name = getOriginName({origin, manifest});
  let icon = getWebAppManifestIcon({manifest, origin, size: 32});
  if(icon) {
    icon = {fetchedImage: icon.src};
  }
  const hint = {
    name, icon, origin, host, manifest,
    hintOption: _createHintOption({name, handlerInfo})
  };
  if(recommendedBy) {
    hint.jit = {recommendedBy};
  }
  return hint;
}

function _createHintOption({name, handlerInfo}) {
  const {
    credentialHandler, enabledTypes, acceptedInput, acceptedProtocols
  } = handlerInfo;
  const hintOption = {
    credentialHandler,
    credentialHint: {
      name, enabledTypes, icons: [], acceptedInput, acceptedProtocols
    },
    credentialHintKey: 'default'
  };
  return hintOption;
}

async function _createJitHint({
  recommendedOrigin, recommendedBy, rpTypes, rpProtocols
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
    const {credentialHandler, enabledTypes} = handlerInfo;

    // exclude any handlers that receive input via a URL that do not have a
    // protocol in common with the relying party
    if(handlerInfo.acceptedInput === 'url' &&
      !_hasMatchingProtocol(rpProtocols, handlerInfo.acceptedProtocols)) {
      return;
    }

    // see if manifest expressed types match request/credential type
    let match = false;
    for(const t of rpTypes) {
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
  recommendedHandlerOrigins, rpTypes, rpProtocols,
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
  return Promise.all(recommendedHandlerOrigins.map(
    async recommendedOrigin => _createJitHint(
      {recommendedOrigin, recommendedBy, rpTypes, rpProtocols})));
}

async function _createRecommendedHints({
  recommendedHandlerOrigins, registeredOrigins,
  credential, credentialRequestOptions,
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

  // get relevant accepted types and protocols to match against handler
  let rpTypes;
  const rpProtocols = (credential?.options || credentialRequestOptions?.web)
    ?.protocols || {};
  if(credentialRequestOptions) {
    // types are all capitalized `{web: {Type1, Type2, ..., TypeN}}`; use this
    // to filter out any non-type parameters in the request
    rpTypes = Object.keys(credentialRequestOptions.web)
      .filter(k => k[0] === k.toUpperCase()[0]);
  } else {
    rpTypes = [credential.dataType];
  }

  // use a maximum of 3 recommended handlers
  recommendedHandlerOrigins = recommendedHandlerOrigins.slice(0, 3);
  /* Note: The current implementation here will only allow the first three
  options from the list to possibly become hints for user selection, even if
  some of those three end up being filtered out because they do not support a
  protocol that matches what the RP accepts. Ideally, if any of those three get
  filtered out more options could be checked, however, checking whether to
  filter an option involves fetching its Web app manifest. So either we fetch
  chunks of Web app manifests in parallel or we potentially fetch too many in
  parallel creating a possibility for bad UX. Right now we just rely on sites
  only recommending a maximum of three handlers anyway until we have a better
  fix for this. */
  const unfilteredHints = await _createJitHints({
    recommendedHandlerOrigins, rpTypes, rpProtocols,
    credentialRequestOrigin, credentialRequestOriginManifest
  });
  return unfilteredHints.filter(e => !!e);
}

async function _createRegisteredHint({registration, rpProtocols}) {
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
    // build `handlerInfo` from existing registration info
    const {
      credentialHint: {enabledTypes, acceptedInput, acceptedProtocols}
    } = registration;
    handlerInfo = {
      credentialHandler, enabledTypes, acceptedInput, acceptedProtocols
    };
  }

  // exclude any handlers that receive input via a URL that do not have a
  // protocol in common with the relying party
  if(handlerInfo.acceptedInput === 'url' &&
    !_hasMatchingProtocol(rpProtocols, handlerInfo.acceptedProtocols)) {
    return;
  }

  const hint = _createHint(
    {credentialHandler, host, origin, manifest, handlerInfo});

  // re-register credential handler if required
  if(_mustRegister({registration, hintOption: hint.hintOption})) {
    await navigator.credentialMediator.ui.registerCredentialHandler(
      credentialHandler, hint.hintOption.credentialHint);
  }

  return hint;
}

async function _createRegisteredHints({
  registrations, rpProtocols, credentialRequestOptions
}) {
  const unfilteredHints = await Promise.all(registrations.map(
    registration => _createRegisteredHint(
      {registration, rpProtocols, credentialRequestOptions})));
  return unfilteredHints.filter(e => !!e);
}

function _getManifestCredentialHandlerInfo({manifest, origin}) {
  if(!manifest) {
    throw new Error(`No Web app manifest for origin "${origin}".`);
  }
  if(manifest.credential_handler &&
    typeof manifest.credential_handler !== 'object') {
    throw new Error(
      'Missing "credential_handler" object in Web app manifest for ' +
      `origin "${origin}".`);
  }

  const {
    credential_handler: {url, enabledTypes, acceptedInput, acceptedProtocols}
  } = manifest;

  // `url` and `enabledTypes` must be defined
  if(typeof url !== 'string') {
    throw new Error(
      'Missing "credential_handler.url" string in Web app manifest for ' +
      `origin "${origin}".`);
  }
  if(!(Array.isArray(enabledTypes) && enabledTypes.length > 0 &&
    enabledTypes.every(p => typeof p === 'string'))) {
    throw new Error(
      '"credential_handler.enabledTypes" must be an array of one or more ' +
      `more strings in app manifest for origin "${origin}".`);
  }
  // `acceptedInput` is optional and defaults to `event`
  if(acceptedInput !== undefined &&
    !(acceptedInput === 'url' || acceptedInput === 'event')) {
    throw new Error(
      'If present, "credential_handler.acceptedInput" must be either ' +
      `"url" or "event" in app manifest for origin "${origin}".`);
  }
  // `acceptedProtocols` is optional unless `acceptedInput` is `url`
  if(acceptedProtocols !== undefined) {
    if(!(Array.isArray(acceptedProtocols) && acceptedProtocols.length > 0 &&
      acceptedProtocols.every(p => typeof p === 'string'))) {
      throw new Error(
        'If present, "credential_handler.acceptedProtocols" must be an ' +
        `array of one or more strings in app manifest for origin "${origin}".`);
    }
  } else if(acceptedInput === 'url') {
    throw new Error(
      'When "credential_handler.acceptedInput" is "url", then ' +
      '"credential_handler.acceptedProtocols" must be defined in ' +
      `app manifest for origin "${origin}".`);
  }
  const credentialHandler = new URL(url, origin).href;
  return {credentialHandler, enabledTypes, acceptedInput, acceptedProtocols};
}

function _mustRegister({registration, hintOption}) {
  // re-register if credential handler changed
  if(registration.credentialHandler !== hintOption.credentialHandler) {
    return true;
  }

  // re-register if `acceptedInput` changed
  const {credentialHint: hint1} = registration;
  const {credentialHint: hint2} = hintOption;
  if(hint1.acceptedInput !== hint2.acceptedInput) {
    return true;
  }

  // re-register if enabled types changed
  if(hint1.enabledTypes?.length !== hint2.enabledTypes?.length) {
    return true;
  }
  if(hint1.enabledTypes &&
    !_arraysEqual(hint1.enabledTypes, hint2.enabledTypes)) {
    return true;
  }

  // re-register if accepted protocols changed
  if(hint1.acceptedProtocols?.length !== hint2.acceptedProtocols?.length) {
    return true;
  }
  if(hint1.acceptedProtocols &&
    !_arraysEqual(hint1.acceptedProtocols, hint2.acceptedProtocols)) {
    return true;
  }

  return false;
}

function _arraysEqual(a1, a2) {
  a1 = a1.slice().sort();
  a2 = a2.slice().sort();
  return a1.every((v1, i1) => v1 === a2[i1]);
}

function _hasMatchingProtocol(rpProtocols, ch) {
  for(const p in rpProtocols) {
    if(!ch.includes(p)) {
      continue;
    }
    const url = rpProtocols[p];
    try {
      new URL(url);
      return true;
    } catch(e) {
      // invalid URL
      console.warn(`Invalid relying party protocol URL "${url}".`);
    }
  }
  return false;
}
