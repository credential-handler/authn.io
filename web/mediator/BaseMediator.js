/*!
 * New BSD License (3-clause)
 * Copyright (c) 2017-2026, Digital Bazaar, Inc.
 */
import {HintManager} from './HintManager.js';
import {WebShareHandler} from './WebShareHandler.js';

import {
  DEFAULT_HANDLER_POPUP_HEIGHT,
  DEFAULT_HANDLER_POPUP_WIDTH,
  IS_MOBILE_DEVICE,
  SUPPORTS_WEB_WALLET_LINK,
  WALLET_LINK_SCHEME_APP,
  WALLET_LINK_SCHEME_WEB
} from './constants.js';

export class BaseMediator {
  constructor() {
    this.credential = null;
    this.credentialRequestOptions = null;
    this.credentialRequestOrigin = null;
    this.credentialRequestOriginManifestPromise = null;
    this.registrationHintOption = null;
    this.selectedHint = null;
    this.hintManager = null;
    this.webShareHandler = null;

    // core UI hooks
    this.hide = null;
    this.ready = null;
    this.show = null;
  }

  getInteractionUrl() {
    const {credential, credentialRequestOptions} = this;
    const protocols =
      (credential?.options || credentialRequestOptions?.web)?.protocols || {};
    // some implementations send `interaction` instead of `interact`
    const url = protocols.interact ?? protocols.interaction;
    if(!url) {
      return null;
    }
    // an interaction URL must be https and always carries `iuv=1` in its
    // value; it is the marker by which a URL is identified as an
    // interaction URL at all, so reject values without it
    try {
      const parsed = new URL(url);
      if(parsed.protocol === 'https:' &&
        parsed.searchParams.get('iuv') === '1') {
        /* the parsed form, not the raw string: `new URL()` strips tabs and
        newlines, so returning the input would ship a value that differs
        from the one that passed validation */
        return parsed.toString();
      }
    } catch {
      // swallow parse errors and warn below
    }
    console.warn(`Invalid relying party interaction URL "${url}".`);
    return null;
  }

  /* Prefixes the interaction URL with the wallet link schemes, so the OS or
  the browser can route it to a wallet that registered a scheme but is not
  registered as a credential handler here.

  Straight concatenation, with no percent-encoding of the interaction URL:
  the scheme is a prefix and the interaction URL keeps its own query string
  (`iuv=1`), so the receiving wallet parses it as an ordinary URL.

  Both links carry the same interaction URL and differ only in prefix, so
  neither is a fallback for the other: a native app can only claim
  `interaction:` and a web app only `web+interaction:`, and nothing in the
  browser reveals which the user registered.

  The app link is offered only on a mobile device, where a wallet app can be
  installed. A desktop is served by the QR code instead, which needs no
  installed app and no scheme registration.

  The web wallet link is offered only where `registerProtocolHandler()`
  exists, since nothing can claim a `web+` scheme without it -- see
  `SUPPORTS_WEB_WALLET_LINK`. Either may be null, so a caller must handle
  one link, both, or (with neither available) none. */
  getWalletLinkUrls() {
    const interactionUrl = this.getInteractionUrl();
    if(!interactionUrl) {
      return null;
    }
    return {
      app: IS_MOBILE_DEVICE ?
        `${WALLET_LINK_SCHEME_APP}${interactionUrl}` : null,
      web: SUPPORTS_WEB_WALLET_LINK ?
        `${WALLET_LINK_SCHEME_WEB}${interactionUrl}` : null
    };
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

  async getWebShareHandler() {
    if(this.webShareHandler) {
      return this.webShareHandler;
    }
    const handler = new WebShareHandler();
    // disable web share
    /*
    const {
      credential, credentialRequestOptions, credentialRequestOrigin
    } = this;
    await handler.initialize(
      {credential, credentialRequestOptions, credentialRequestOrigin});
    */
    this.webShareHandler = handler;
    return handler;
  }

  async selectHint({hint, allowHandlerPopup = true}) {
    if(this.selectedHint) {
      throw new Error('Hint already selected.');
    }
    this.selectedHint = hint;

    if(allowHandlerPopup) {
      // if the request is to be sent via URL, it must be done now to prevent
      // the popup from being blocked
      const {hintOption: {credentialHint: {acceptedInput}}} = hint;
      const sendRequestViaUrl = acceptedInput === 'url';
      if(sendRequestViaUrl) {
        await this._sendCredentialRequestViaUrl({hint});
      }
    }

    // auto-register handler if hint was JIT-created
    if(hint.jit) {
      await HintManager.autoRegisterHint({hint});
    }
  }

  startNewRequest() {
    this.hintManager = new HintManager();
    this.selectedHint = null;
    this.webShareHandler = null;
  }

  async webShare() {
    const handler = await this.getWebShareHandler();
    if(!handler.enabled) {
      console.log('WebShare not available on this platform.');
      return false;
    }
    await handler.share();
    return false;
  }

  async _sendCredentialRequestViaUrl({hint}) {
    // build URL w/`request` param
    const {
      credentialHandler, credentialHint: {acceptedProtocols}
    } = hint.hintOption;
    const parsed = new URL(credentialHandler);
    const {
      credential,
      credentialRequestOptions,
      credentialRequestOrigin
    } = this;
    // send only accepted protocol URLs
    const rpProtocols = (credential?.options || credentialRequestOptions.web)
      ?.protocols || {};
    const protocols = {};
    for(const p in rpProtocols) {
      if(acceptedProtocols.includes(p)) {
        protocols[p] = rpProtocols[p];
      }
    }

    // FIXME: use gzip as well?
    const request = JSON.stringify({credentialRequestOrigin, protocols});
    parsed.searchParams.set('request', request);
    const url = parsed.toString();

    const width = Math.min(DEFAULT_HANDLER_POPUP_WIDTH, window.innerWidth);
    const height = Math.min(DEFAULT_HANDLER_POPUP_HEIGHT, window.innerHeight);
    const left = Math.floor(window.screenX + (window.innerWidth - width) / 2);
    const top = Math.floor(window.screenY + (window.innerHeight - height) / 2);
    const features =
      'popup=yes,menubar=no,scrollbars=no,status=no,noopener=yes,' +
      `width=${width},height=${height},left=${left},top=${top}`;
    window.open(url, '_blank', features);
  }
}
