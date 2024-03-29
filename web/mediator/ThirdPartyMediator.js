/*!
 * New BSD License (3-clause)
 * Copyright (c) 2017-2023, Digital Bazaar, Inc.
 * All rights reserved.
 */
import {getSiteChoice, hasSiteChoice, setSiteChoice} from './siteChoice.js';
import {BaseMediator} from './BaseMediator.js';
import {getWebAppManifest} from './manifest.js';
import {hasPartitionedStorage} from './platformDetection.js';
import {HintManager} from './HintManager.js';
import {loadOnce} from 'credential-mediator-polyfill';
import {WebAppContext} from 'web-request-rpc';

import {
  DEFAULT_ALLOW_WALLET_POPUP_HEIGHT,
  DEFAULT_ALLOW_WALLET_POPUP_WIDTH,
  DEFAULT_HANDLER_POPUP_HEIGHT,
  DEFAULT_HANDLER_POPUP_WIDTH,
  DEFAULT_HINT_CHOOSER_POPUP_HEIGHT,
  DEFAULT_HINT_CHOOSER_POPUP_WIDTH
} from './constants.js';

export class ThirdPartyMediator extends BaseMediator {
  constructor() {
    super();
    this.deferredCredentialOperation = null;
    this.firstPartyDialog = null;
    // 3p mediator has no access to 1p storage if platform's storage is
    // partitioned
    this.hasStorageAccess = !hasPartitionedStorage();
    this.resolvePermissionRequest = null;
    this.showHandlerWindow = null;

    // this mediator instance is in a 3p context, communicating directly
    // with the origin making a credential-related request
    const {origin} = new URL(document.referrer);
    this.credentialRequestOrigin = origin;
    // start loading web app manifest immediately
    this.credentialRequestOriginManifestPromise = getWebAppManifest({origin});
  }

  async initialize({show, hide, ready, showHandlerWindow} = {}) {
    this.show = show;
    this.hide = async () => {
      await hide();
      if(this.firstPartyDialog) {
        this.firstPartyDialog.close();
        this.firstPartyDialog = null;
      }
    };
    this.ready = ready;
    this.showHandlerWindow = showHandlerWindow;

    const {credentialRequestOrigin} = this;
    await loadOnce({
      credentialRequestOrigin,
      requestPermission: _requestPermission.bind(this),
      getCredential: _handleCredentialRequest.bind(this, 'credentialRequest'),
      storeCredential: _handleCredentialRequest.bind(this, 'credentialStore'),
      getCredentialHandlerInjector: _getCredentialHandlerInjector.bind(this)
    });
  }

  async allowCredentialHandler() {
    await super.allowCredentialHandler();
    await this._finishPermissionRequest({state: 'granted'});
  }

  async cancel() {
    if(this.resolvePermissionRequest) {
      return this.denyCredentialHandler();
    }
    await this.cancelSelection();
    await this.hide();
    if(this.deferredCredentialOperation) {
      this.deferredCredentialOperation.resolve(null);
    }
    await navigator.credentialMediator.hide();
  }

  async cancelSelection() {
    if(this.selectedHint) {
      await navigator.credentialMediator.ui.cancelSelectCredentialHint();
    }
  }

  async denyCredentialHandler() {
    return this._finishPermissionRequest({state: 'denied'});
  }

  focusFirstPartyDialog() {
    if(this.firstPartyDialog) {
      this.firstPartyDialog.handle.focus();
    }
  }

  async handlePermissionRequestWithFirstPartyMediator({opened, closed} = {}) {
    const {
      registrationHintOption,
      credentialRequestOrigin, credentialRequestOriginManifestPromise
    } = this;
    const credentialRequestOriginManifest =
      await credentialRequestOriginManifestPromise;

    let status;
    try {
      const result = await this._handleEventInFirstPartyDialog({
        url: `${window.location.origin}/mediator/allow-wallet`,
        bounds: {
          width: DEFAULT_ALLOW_WALLET_POPUP_WIDTH,
          height: DEFAULT_ALLOW_WALLET_POPUP_HEIGHT
        },
        event: {
          type: 'allowcredentialhandler',
          credentialRequestOrigin,
          credentialRequestOriginManifest,
          registrationHintOption
        },
        opened,
        closed,
        autoClose: true
      });
      if(!result) {
        status = {state: 'denied'};
      } else if(result.error) {
        const error = new Error(result.error.message);
        error.name = result.error.name;
        throw error;
      } else {
        ({status} = result);
      }
    } catch(e) {
      console.error('Error while setting permission', e);
      status = {state: 'denied'};
    }

    // return that status was already `set` in 1p window
    await this._finishPermissionRequest({state: status.state, set: true});
  }

  async getHintChoiceWithFirstPartyMediator({opened, closed} = {}) {
    const {
      credential, credentialRequestOptions,
      credentialRequestOrigin, credentialRequestOriginManifestPromise
    } = this;
    const credentialRequestOriginManifest =
      await credentialRequestOriginManifestPromise;

    try {
      const result = await this._handleEventInFirstPartyDialog({
        url: `${window.location.origin}/mediator/wallet-chooser`,
        bounds: {
          width: DEFAULT_HINT_CHOOSER_POPUP_WIDTH,
          height: DEFAULT_HINT_CHOOSER_POPUP_HEIGHT
        },
        event: {
          type: 'selectcredentialhint',
          credentialRequestOptions,
          credentialRequestOrigin,
          credentialRequestOriginManifest,
          credential,
          hintKey: undefined
        },
        opened,
        closed
      });
      const {choice} = result;
      return {choice};
    } catch(e) {
      return {choice: null};
    }
  }

  async selectHint({hint, rememberChoice = false}) {
    // if a first party dialog is in use, do not allow the base mediator to
    // open a handler popup, it was already handled in the first party dialog
    await super.selectHint({hint, allowHandlerPopup: !this.firstPartyDialog});

    // determine if credential handler already received request via URL
    // via `super.selectHint` or if we must send it below via an event
    const {hintOption: {credentialHint: {acceptedInput}}} = hint;
    const sentRequestViaUrl = acceptedInput === 'url';

    // note: always clear choice for site if credential handler received
    // data via URL because there is no way to cancel / undo
    const {credentialRequestOrigin} = this;
    if(rememberChoice && this.hasStorageAccess && !sentRequestViaUrl) {
      // save choice for site
      const {credentialHandler} = hint.hintOption;
      setSiteChoice({credentialRequestOrigin, credentialHandler});
    } else {
      // clear choice for site
      setSiteChoice({credentialRequestOrigin, credentialHandler: null});
    }

    let canceled = false;
    let response;
    try {
      if(sentRequestViaUrl) {
        // indicate handler handled the request out-of-band
        response = {
          type: 'web',
          dataType: 'OutOfBand',
          data: null
        };
      } else {
        // if request was not already sent via URL, send it via event and
        // obtain response via event
        response = await navigator.credentialMediator.ui.selectCredentialHint(
          hint.hintOption);
        if(!response) {
          // no response from credential handler, so clear site choice
          setSiteChoice({credentialRequestOrigin, credentialHandler: null});
        }
      }
      this.deferredCredentialOperation.resolve(response);
    } catch(e) {
      if(e.name === 'AbortError') {
        canceled = true;
      } else {
        console.error(e);
        this.deferredCredentialOperation.reject(e);
      }
    } finally {
      this.selectedHint = null;
    }

    if(canceled) {
      // clear site choice
      setSiteChoice({credentialRequestOrigin, credentialHandler: null});
    } else {
      try {
        await this.hide();
        await navigator.credentialMediator.hide();
      } catch(e) {
        console.error(e);
      }
    }

    return {canceled};
  }

  async _finishPermissionRequest(result) {
    this.resolvePermissionRequest(result);
    await this.hide();
    await navigator.credentialMediator.hide();
  }

  async _handleEventInFirstPartyDialog({
    url, bounds, event, opened, closed, autoClose = false
  } = {}) {
    // create WebAppContext to run WebApp and connect to windowClient
    const appContext = new WebAppContext();
    const windowReady = appContext.createWindow(url, {
      popup: true,
      // loading should be quick to same mediator site
      timeout: 30000,
      bounds
    });

    // save reference to current first party window
    this.firstPartyDialog = appContext.control.dialog;
    await opened();

    // provide access to injector inside dialog destroy in case the user closes
    // the dialog -- so we can abort awaiting `proxy.send`
    let aborted = false;
    const {dialog} = appContext.control;
    const abort = async () => {
      // note that `dialog` is not native so `{once: true}` does not work as
      // an option to pass to `addEventListener`
      dialog.removeEventListener('close', abort);
      aborted = true;
      windowReady.then(injector => injector.client.close());
      await closed();
    };
    dialog.addEventListener('close', abort);

    // create proxy interface for making calls in WebApp
    const injector = await windowReady;

    appContext.control.show();

    const proxy = injector.get('credentialEventProxy', {
      functions: [{name: 'send', options: {timeout: 0}}]
    });

    try {
      return await proxy.send(event);
    } catch(e) {
      if(!aborted) {
        // unexpected error, log it
        console.error(e);
      }
      return null;
    } finally {
      if(autoClose) {
        appContext.control.hide();
      }
    }
  }

  async _startCredentialFlow() {
    // delay showing mediator UI if the site has a potential saved choice as
    // there may be no need to show it at all
    const {credentialRequestOrigin} = this;
    const delayShowMediator = hasSiteChoice({credentialRequestOrigin});
    let showMediatorPromise;
    if(delayShowMediator) {
      // delay showing mediator if request can be handled quickly
      // (we choose 1 frame here = ~16ms);
      // otherwise show it to let user know something is happening
      showMediatorPromise = new Promise((resolve, reject) => {
        setTimeout(() => {
          navigator.credentialMediator.show().then(resolve, reject);
        }, 16);
      });
    } else {
      showMediatorPromise = navigator.credentialMediator.show();
    }

    // start loading hint manager if mediator has storage access
    if(this.hasStorageAccess) {
      const {
        credential, credentialRequestOptions,
        credentialRequestOrigin, credentialRequestOriginManifestPromise
      } = this;
      await this.hintManager.initialize({
        credential, credentialRequestOptions,
        credentialRequestOrigin, credentialRequestOriginManifestPromise
      });
      // if there is a remembered hint, it will cause the handler window
      // to open immediately
      this._useRememberedHint();
    }

    // await showing mediator UI
    await showMediatorPromise;

    await this.ready();
  }

  _useRememberedHint() {
    // check to see if there is a reusable choice for the relying party
    // (as identified by the credential request origin)
    const {credentialRequestOrigin} = this;
    const {hints} = this.hintManager;
    const hint = getSiteChoice({credentialRequestOrigin, hints});
    if(hint) {
      this.selectHint({hint, rememberChoice: true}).catch(() => {});
      return true;
    }
    return false;
  }
}

// called when a request for credential handler permission is made by the RP
async function _requestPermission(/*permissionDesc*/) {
  const promise = new Promise(resolve => {
    this.resolvePermissionRequest = status => resolve(status);
  });

  this.startNewRequest();

  // show custom UI
  await this.show({requestType: 'permissionRequest'});

  // show display
  await navigator.credentialMediator.show();

  // no manifest means permission is automatically denied
  const manifest = await this.credentialRequestOriginManifestPromise;
  if(!manifest) {
    console.error('Missing Web app manifest.');
    this.resolvePermissionRequest({state: 'denied'});
    await this.hide();
    await navigator.credentialMediator.hide();
    return promise;
  }

  // create registration hint option for origin
  this.registrationHintOption = await HintManager.createHintOption(
    {origin: this.credentialRequestOrigin, manifest});
  if(!this.registrationHintOption) {
    console.error(
      'Missing or invalid "credential_handler" in Web app manifest.');
    this.resolvePermissionRequest({state: 'denied'});
    await this.hide();
    await navigator.credentialMediator.hide();
  }

  await this.ready();

  return promise;
}

async function _getCredentialHandlerInjector({appContext, credentialHandler}) {
  // `firstPartyDialog` will be set when using a platform that requires 1p mode
  const {firstPartyDialog: dialog} = this;
  if(dialog) {
    dialog.setLocation(credentialHandler);
  }

  const width = Math.min(DEFAULT_HANDLER_POPUP_WIDTH, window.innerWidth);
  const height = Math.min(DEFAULT_HANDLER_POPUP_HEIGHT, window.innerHeight);

  const windowReady = appContext.createWindow(credentialHandler, {
    dialog,
    popup: !!dialog,
    customize: _updateHandlerWindow.bind(this),
    // allow 24 hour timeout for loading other window on same site
    // to allow for authentication pages and similar; user can reload site or
    // close window if there is a problem
    timeout: 24 * 60 * 60 * 1000,
    // default bounding rectangle for the credential handler window
    bounds: {
      top: window.screenY + (window.innerHeight - height) / 2,
      left: window.screenX + (window.innerWidth - width) / 2,
      width,
      height
    }
  });

  // `windowReady` resolves to injector instance
  return windowReady;
}

async function _handleCredentialRequest(requestType, operationState) {
  const {
    input: {credential = null, credentialRequestOptions = null}
  } = operationState;
  this.credential = credential;
  this.credentialRequestOptions = credentialRequestOptions;
  const promise = new Promise((resolve, reject) => {
    this.deferredCredentialOperation = {resolve, reject};
  });

  this.startNewRequest();

  // show custom UI
  await this.show({requestType});

  await this._startCredentialFlow();
  return promise;
}

function _updateHandlerWindow({webAppWindow}) {
  // handle 1p dialog
  if(webAppWindow.popup) {
    // handle user closing popup
    const {dialog} = webAppWindow;
    const abort = () => {
      // note that `dialog` is not native so `{once: true}` does not work as
      // and option to pass to `addEventListener`
      dialog.removeEventListener('close', abort);
      // Options for cancelation behavior are:
      // this.cancelSelection -- close handler UI but keep CHAPI UI up
      // this.cancel -- close CHAPI entirely
      this.cancelSelection();
    };
    dialog.addEventListener('close', abort);
    return;
  }

  // handle 3p dialog
  this.showHandlerWindow({webAppWindow});
}
