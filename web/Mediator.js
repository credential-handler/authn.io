/*!
 * New BSD License (3-clause)
 * Copyright (c) 2017-2023, Digital Bazaar, Inc.
 * All rights reserved.
 */
import {
  autoRegisterHint,
  createDefaultHintOption,
  createHintOptions,
  createJitHints,
  createWebShareData,
  getOriginName,
  loadHints,
  openAllowWalletWindow,
  openCredentialHintWindow,
  parseUrl,
  webShareHasFileSupport
} from './helpers.js';
import {getSiteChoice, hasSiteChoice, setSiteChoice} from './siteChoice.js';
import {CredentialEventProxy} from './CredentialEventProxy.js';
import {getWebAppManifest} from './manifest.js';
import HandlerWindowHeader from './components/HandlerWindowHeader.vue';
import {loadOnce} from 'credential-mediator-polyfill';
import {shouldUseFirstPartyMode} from './platformDetection.js';
// FIXME: remove this, only vanilla JS permitted in this file
import Vue from 'vue';
import {WebAppContext} from 'web-request-rpc';

const DEFAULT_ALLOW_WALLET_POPUP_WIDTH = 500;
const DEFAULT_ALLOW_WALLET_POPUP_HEIGHT = 240;

const DEFAULT_HANDLER_POPUP_WIDTH = 800;
const DEFAULT_HANDLER_POPUP_HEIGHT = 600;

export class Mediator {
  constructor() {
    this.credentialRequestOrigin = null;
    this.deferredCredentialOperation = null;
    this.firstPartyMode = true;
    this.hide = null;
    this.hintOptions = [];
    this.operationState = null;
    // FIXME: perhaps rename to firstPartyDialog
    this.popupDialog = null;
    this.proxiedEvent = null;
    this.ready = null;
    this.registrationHintOption = null;
    this.resolvePermissionRequest = null;
    this.relyingOrigin = null;
    this.relyingOriginManifestPromise = null;
    this.selectedHint = null;
    this.show = null;
  }

  async initialize({show, hide, ready, proxy} = {}) {
    // enable getting credential request origin asynchronously
    let deferredGetCredentialRequestOrigin;
    const credentialRequestOrigin = new Promise((resolve, reject) => {
      deferredGetCredentialRequestOrigin = {resolve, reject};
    });

    try {
      this.show = show;
      // FIXME: might need to augment `hide` with closing `popupDialog
      this.hide = async () => {
        await hide();
        // FIXME: determine if this is the right / only place needed for this
        if(this.popupDialog) {
          this.popupDialog.close();
          this.popupDialog = null;
        }
      };
      this.ready = ready;

      // FIXME: consider setting this on construction
      this.firstPartyMode = shouldUseFirstPartyMode();

      let eventProxy;
      let rpcServices;
      if(proxy) {
        // this mediator instance is loaded in a 1p context that
        // communicates with the mediator instance in the 3p context;
        // create event proxy to receive events from the 3p context
        eventProxy = new CredentialEventProxy();
        rpcServices = eventProxy.createServiceDescription();
      } else {
        // this mediator instance is in a 3p context, communicating directly
        // with the relying origin
        const {origin} = parseUrl({url: document.referrer});
        this.relyingOrigin = origin;
        deferredGetCredentialRequestOrigin.resolve(origin);
        // start loading web app manifest
        this.relyingOriginManifestPromise = getWebAppManifest({origin});
      }

      await loadOnce({
        credentialRequestOrigin,
        requestPermission: requestPermission.bind(this),
        getCredential: handleCredentialRequest.bind(this, 'credentialRequest'),
        storeCredential: handleCredentialRequest.bind(this, 'credentialStore'),
        getCredentialHandlerInjector: getCredentialHandlerInjector.bind(this),
        rpcServices
      });

      if(proxy) {
        const event = this.proxiedEvent = await eventProxy.receive();
        const {
          credentialRequestOrigin: origin,
          credentialRequestOriginManifest: manifest,
          registrationHintOption
        } = event;
        this.relyingOrigin = origin;
        this.relyingOriginManifestPromise = manifest;
        this.registrationHintOption = registrationHintOption;
        deferredGetCredentialRequestOrigin.resolve(origin);
      }
    } catch(e) {
      deferredGetCredentialRequestOrigin.reject(e);
      console.error('Error initializing mediator:', e);
    }
  }

  async allowCredentialHandler() {
    const {registrationHintOption} = this;
    // FIXME: is this conditional even possible?
    if(!registrationHintOption) {
      return this.denyCredentialHandler();
    }
    const {
      credentialHandler, credentialHintKey, enabledTypes
    } = registrationHintOption;
    const hint = {name: credentialHintKey, enabledTypes};
    await navigator.credentialMediator.ui.registerCredentialHandler(
      credentialHandler, hint);
    this.resolvePermissionRequest({state: 'granted'});
    await this.hide();
    await navigator.credentialMediator.hide();
  }

  async cancel() {
    if(this.selectedHint) {
      await this.cancelSelection();
    }
    await this.hide();
    if(this.deferredCredentialOperation) {
      this.deferredCredentialOperation.resolve(null);
    }
    await navigator.credentialMediator.hide();
  }

  async cancelSelection() {
    await navigator.credentialMediator.ui.cancelSelectCredentialHint();
  }

  async denyCredentialHandler() {
    this.resolvePermissionRequest({state: 'denied'});
    await this.hide();
    await navigator.credentialMediator.hide();
  }

  async handleFirstPartyPermissionRequest({}) {
    const {status} = await this.openAllowWalletWindow({
      credentialRequestOrigin: relyingOrigin,
      credentialRequestOriginManifest: relyingOriginManifest
    });

    // if a status was returned... (vs. closing the window / error)
    if(status) {
      // return that status was already set in 1p window
      const resolvePermissionRequest = getResolvePermissionRequest();
      resolvePermissionRequest({state: status.state, set: true});
      this.reset();
      await navigator.credentialMediator.hide();
    }
  }

  async selectHint({hint, rememberChoice = false}) {
    // track to enable later cancelation
    this.selectedHint = hint;

    // auto-register handler if hint was JIT-created
    if(hint.jit) {
      await autoRegisterHint({hint});
    }

    const {relyingOrigin} = this;
    if(rememberChoice && !this.firstPartyMode) {
      // save choice for site
      const {credentialHandler} = hint.hintOption;
      setSiteChoice({relyingOrigin, credentialHandler});
    } else {
      // clear choice for site
      setSiteChoice({relyingOrigin, credentialHandler: null});
    }

    let canceled = false;
    let response;
    try {
      response = await navigator.credentialMediator.ui.selectCredentialHint(
        hint.hintOption);
      if(!response) {
        // no response from credential handler, so clear site choice
        setSiteChoice({relyingOrigin, credentialHandler: null});
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
      setSiteChoice({relyingOrigin, credentialHandler: null});
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

  async _loadHints() {
    const {
      operationState: {input: {credentialRequestOptions, credential}},
      relyingOrigin, relyingOriginManifestPromise
    } = this;
    const hintOptions = await loadHints({
      credentialRequestOptions, credential,
      relyingOrigin, relyingOriginManifest: await relyingOriginManifestPromise
    });
    // FIXME: handle case that operation changed while the hints were loading,
    // if that case still needs handling now
    this.hintOptions = hintOptions;
    return this.hintOptions;
  }

  async _openAllowWalletWindow() {
    const url = `${window.location.origin}/mediator/allow-wallet`;
    const {
      registrationHintOption,
      relyingOrigin, relyingOriginManifestPromise
    } = this;
    const relyingOriginManifest = await relyingOriginManifestPromise;

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
    this.popupDialog = appContext.control.dialog;
    // FIXME: `popupOpen` should become some kind of callback / abort signal
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
        credentialRequestOrigin: relyingOrigin,
        credentialRequestOriginManifest: relyingOriginManifest,
        registrationHintOption
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

  async _startCredentialFlow() {
    // delay showing mediator UI if the site has a potential saved choice as
    // there may be no need to show it at all
    const {relyingOrigin} = this;
    const delayShowMediator = hasSiteChoice({relyingOrigin});
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

    // load and show hints immediately in non-1p mode
    if(!this.firstPartyMode) {
      // load hints early if possible to avoid showing UI
      await this._loadHints();
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
    const {hintOptions, relyingOrigin} = this;
    const hint = getSiteChoice({relyingOrigin, hintOptions});
    console.log('use remembered hint', hint);
    if(hint) {
      // FIXME: old UI flags here
      // this.showGreeting = false;
      //this.selectHint({hint, waitUntil() {}});
      this.selectHint({hint, rememberChoice: true}).catch(() => {});
      return true;
    }
    return false;
  }
}

// FIXME: reorder helpers

async function getCredentialHandlerInjector({appContext, credentialHandler}) {
  // FIXME: define `_popupDialog` in `Mediator`?
  // FIXME: this will come from 1p mode only
  const {_popupDialog: dialog} = this;
  if(dialog) {
    dialog.setLocation(credentialHandler);
  }

  const width = Math.min(DEFAULT_HANDLER_POPUP_WIDTH, window.innerWidth);
  const height = Math.min(DEFAULT_HANDLER_POPUP_HEIGHT, window.innerHeight);

  const windowReady = appContext.createWindow(credentialHandler, {
    dialog,
    popup: !!dialog,
    customize: updateHandlerWindow.bind(this),
    // default to 10 minute timeout for loading other window on same site
    // to allow for authentication pages and similar
    // FIXME: remove timeout entirely?
    timeout: 600000,
    // default bounding rectangle for the credential handler window
    bounds: {
      top: window.screenY + (window.innerHeight - height) / 2,
      left: window.screenX + (window.innerWidth - width) / 2,
      width,
      height
    }
  });

  const injector = await windowReady;

  return injector;
}

// called when a request for credential handler permission is made by the RP
async function requestPermission(/*permissionDesc*/) {
  const promise = new Promise(resolve => {
    this.resolvePermissionRequest = status => resolve(status);
  });

  // show custom UI
  await this.show({requestType: 'permissionRequest', operationState: null});

  // show display
  await navigator.credentialMediator.show();

  // no manifest means permission is automatically denied
  const manifest = await this.relyingOriginManifestPromise;
  if(!manifest) {
    console.error('Missing Web app manifest.');
    this.resolvePermissionRequest({state: 'denied'});
    await this.hide();
    await navigator.credentialMediator.hide();
    return promise;
  }

  // create registration hint option for origin
  // FIXME: rename `hintOption` to be more clear that it's for registering
  // a credential handler
  this.registrationHintOption = await createDefaultHintOption(
    {origin: this.relyingOrigin, manifest});
  if(!this.registrationHintOption) {
    console.error(
      'Missing or invalid "credential_handler" in Web app manifest.');
    this.resolvePermissionRequest({state: 'denied'});
    await this.hide();
    await navigator.credentialMediator.hide();
  }

  // FIXME: see if this can be removed
  await this.ready();

  return promise;
}

async function handleCredentialRequest(requestType, operationState) {
  this.operationState = operationState;
  const promise = new Promise((resolve, reject) => {
    this.deferredCredentialOperation = {resolve, reject};
  });

  // show custom UI
  await this.show({requestType, operationState});

  await this._startCredentialFlow();
  return promise;
}

// FIXME: determine abstraction boundary to enable injection of this
function updateHandlerWindow({webAppWindow}) {
  const self = this;

  if(webAppWindow.popup) {
    // handle user closing popup
    const {dialog} = webAppWindow;
    // FIXME: use `{once: true}` instead of using removeEventListener
    dialog.addEventListener('close', function abort() {
      // Options for cancelation behavior are:
      // self.cancelSelection -- close handler UI but keep CHAPI UI up
      // self.cancel -- close CHAPI entirely
      self.cancelSelection();
      dialog.removeEventListener('close', abort);
    });
    return;
  }

  // FIXME: convert to vue 3 via:
  /*
  const el = document.createElement('div');
  container.insertBefore(el, iframe);
  container.classList.add('wrm-slide-up');
  const component = createApp({extends: HandlerWindowHeader}, {
    // FIXME: determine how to do clean up
    onClose() {
      component.unmount();
      el.remove();
    }
  });
  component.mount(el);
  */
  const {container, iframe} = webAppWindow.dialog;
  const Component = Vue.extend(HandlerWindowHeader);
  const el = document.createElement('div');
  container.insertBefore(el, iframe);
  container.classList.add('wrm-slide-up');
  new Component({
    el,
    propsData: {
      hint: self.selectedHint
    },
    created() {
      this.$on('back', self.cancelSelection.bind(self));
      this.$on('cancel', self.cancel.bind(self));
    }
  });
  // clear iframe style that was set by web-request-rpc; set instead via CSS
  iframe.style.cssText = null;
  iframe.classList.add('wrm-handler-iframe');
}
