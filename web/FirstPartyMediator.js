/*!
 * New BSD License (3-clause)
 * Copyright (c) 2017-2023, Digital Bazaar, Inc.
 * All rights reserved.
 */
import {
  createDefaultHintOption,
  loadHints
} from './helpers.js';
import {getSiteChoice, hasSiteChoice} from './siteChoice.js';
import {CredentialEventProxy} from './CredentialEventProxy.js';
import HandlerWindowHeader from './components/HandlerWindowHeader.vue';
import {loadOnce} from 'credential-mediator-polyfill';
import {BaseMediator} from './BaseMediator.js';
import {PermissionManager} from 'credential-mediator-polyfill';
import {shouldUseFirstPartyMode} from './platformDetection.js';
// FIXME: remove this, only vanilla JS permitted in this file
import Vue from 'vue';

const DEFAULT_HANDLER_POPUP_WIDTH = 800;
const DEFAULT_HANDLER_POPUP_HEIGHT = 600;

export class FirstPartyMediator extends BaseMediator {
  constructor() {
    super();
    this.credential = null;
    this.credentialRequestOptions = null;
    this.credentialRequestOrigin = null;
    this.credentialRequestOriginManifest = null;
    this.registrationHintOption = null;

    // FIXME: determine utility
    this.firstPartyMode = true;
    this.hide = null;
    this.hintOptions = [];
    this.ready = null;
    this.show = null;
  }

  async initialize({show, hide, ready} = {}) {
    // enable getting credential request origin asynchronously
    let deferredGetCredentialRequestOrigin;
    const credentialRequestOriginPromise = new Promise((resolve, reject) => {
      deferredGetCredentialRequestOrigin = {resolve, reject};
    });

    try {
      this.show = show;
      // FIXME: is `hide` needed?
      this.hide = hide;
      this.ready = ready;

      // FIXME: remove `firstPartyMode` from this mediator, it's assumed
      // FIXME: consider setting this on construction
      this.firstPartyMode = shouldUseFirstPartyMode();

      // this mediator instance is loaded in a 1p context that communicates
      // with the mediator instance in the 3p context; create an event proxy to
      // receive events from the 3p context
      const proxy = new CredentialEventProxy();
      const rpcServices = proxy.createServiceDescription();

      await loadOnce({
        credentialRequestOrigin: credentialRequestOriginPromise,
        // FIXME: these are likely only used in 3p mediator, 1p mediator
        // probably never receives the events
        requestPermission: requestPermission.bind(this),
        getCredential: handleCredentialRequest.bind(this, 'credentialRequest'),
        storeCredential: handleCredentialRequest.bind(this, 'credentialStore'),
        // FIXME: determine if / how this is used in 1p mode; likely is not
        // called at all and only `rpcServices` are actually used
        getCredentialHandlerInjector: getCredentialHandlerInjector.bind(this),
        rpcServices
      });

      // receive proxied event from mediator in 3p context
      this.proxiedEvent = await proxy.receive();
      const {
        type,
        credential,
        credentialRequestOptions,
        credentialRequestOrigin,
        credentialRequestOriginManifest,
        registrationHintOption
      } = this.proxiedEvent;
      this.credential = credential;
      this.credentialRequestOptions = credentialRequestOptions;
      this.credentialRequestOrigin = credentialRequestOrigin;
      this.credentialRequestOriginManifest = credentialRequestOriginManifest;
      this.registrationHintOption = registrationHintOption;
      deferredGetCredentialRequestOrigin.resolve(credentialRequestOrigin);

      await this.show();
      if(type === 'selectcredentialhint') {
        await this._loadHints();
      }
      await this.ready();
    } catch(e) {
      deferredGetCredentialRequestOrigin.reject(e);
      throw e;
    }
  }

  async allowCredentialHandler() {
    await super.allowCredentialHandler();
    const status = {state: 'granted'};
    this.proxiedEvent.respondWith({status});
    // FIXME: do we need to call `hide` here?
    await this.hide();
  }

  async cancel() {
    // FIXME: modify / remove for 1p mediator
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
    // FIXME: modify / remove for 1p mediator
    await navigator.credentialMediator.ui.cancelSelectCredentialHint();
  }

  async denyCredentialHandler() {
    const status = {state: 'denied'};
    try {
      // set permission directly via permission manager
      const {relyingOrigin} = this;
      const pm = new PermissionManager(relyingOrigin, {request: () => status});
      pm._registerPermission('credentialhandler');
      await pm.request({name: 'credentialhandler'});
    } catch(e) {
      console.error(e);
    }
    this.proxiedEvent.respondWith({status});
    // FIXME: do we need to call `hide` here?
    await this.hide();
  }

  async selectHint({hint}) {
    this.proxiedEvent.respondWith({choice: {hint}});
  }

  // FIXME: better generalize, perhaps by passing in `relyingOrigin`, etc. or
  // making the variable names the same across 1p and 3p mediators
  async _loadHints() {
    const {
      // FIXME: generalize
      credentialRequestOptions, credential,
      // FIXME: generalize
      credentialRequestOrigin: relyingOrigin,
      credentialRequestOriginManifest: relyingOriginManifest
    } = this;
    const hintOptions = await loadHints({
      credentialRequestOptions, credential,
      relyingOrigin, relyingOriginManifest
    });
    // FIXME: handle case that operation changed while the hints were loading,
    // if that case still needs handling now
    this.hintOptions = hintOptions;
    return this.hintOptions;
  }

  // FIXME: does this happen?
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

  // FIXME: remove me
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
