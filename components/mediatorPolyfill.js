/*!
 * New BSD License (3-clause)
 * Copyright (c) 2017-2022, Digital Bazaar, Inc.
 * All rights reserved.
 */
// FIXME: consider renaming file
import {createDefaultHintOption} from './helpers.js';
import {getWebAppManifest} from './manifest.js';
import HandlerWindowHeader from './HandlerWindowHeader.vue';
import {loadOnce} from 'credential-mediator-polyfill';
import {utils} from 'web-request-rpc';
import Vue from 'vue';

// default popup handler width and height
const DEFAULT_HANDLER_POPUP_WIDTH = 800;
const DEFAULT_HANDLER_POPUP_HEIGHT = 600;

let deferredCredentialOperation;
let resolvePermissionRequest;

export function getDeferredCredentialOperation() {
  return deferredCredentialOperation;
}

export function getResolvePermissionRequest() {
  return resolvePermissionRequest;
}

// FIXME: instead of passing `component`, pass handler callbacks to pass
// into `loadOnce`
export async function loadPolyfill({
  component, credentialRequestOrigin, rpcServices = {}
}) {
  try {
    await loadOnce({
      credentialRequestOrigin,
      requestPermission: requestPermission.bind(component),
      getCredential: getCredential.bind(component),
      storeCredential: storeCredential.bind(component),
      getCredentialHandlerInjector:
        getCredentialHandlerInjector.bind(component),
      rpcServices
    });
  } catch(e) {
    console.error('Error loading mediator polyfill:', e);
  }
}

async function getCredentialHandlerInjector({appContext, credentialHandler}) {
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

// FIXME: these functions are commonly used whether `this` is bound to
// an `AllowWalletDialog`, `HintChooser`, or `Mediator` component; but some
// of the properties aren't shared across those components ... this needs
// refactoring to remove components from it ... the needs here are to show
// some kind of loading screen in the UI (presumably) while the async calls
// are made in this function, so need some affordances to do that here
// FIXME: perhaps create those APIs before the Vue 3 changes land
async function requestPermission(/*permissionDesc*/) {
  // prep display
  this.display = 'permissionRequest';
  this.showHintChooser = false;
  this.showGreeting = true;
  const promise = new Promise(resolve => {
    resolvePermissionRequest = status => resolve(status);
  });

  // show display
  await navigator.credentialMediator.show();

  // attempt to load web app manifest icon
  const manifest = await getWebAppManifest({host: this.relyingDomain});
  this.relyingOriginManifest = manifest;

  if(!this.relyingOriginManifest) {
    console.error('Missing Web app manifest.');
    resolvePermissionRequest({state: 'denied'});
    await navigator.credentialMediator.hide();
  } else {
    // generate hint option for origin
    this.defaultHintOption = await createDefaultHintOption(
      {origin: this.relyingOrigin, manifest: this.relyingOriginManifest});
    if(!this.defaultHintOption) {
      console.error(
        'Missing or invalid "credential_handler" in Web app manifest.');
      resolvePermissionRequest({state: 'denied'});
      await navigator.credentialMediator.hide();
    }
  }

  this.loading = false;
  return promise;
}

async function getCredential(operationState) {
  // prep display
  this.display = 'credentialRequest';
  this.credentialRequestOptions = operationState.input.credentialRequestOptions;
  this.showHintChooser = false;
  this.showGreeting = true;
  const promise = new Promise((resolve, reject) => {
    deferredCredentialOperation = {resolve, reject};
  });

  await this.startCredentialFlow();
  return promise;
}

async function storeCredential(operationState) {
  // prep display
  this.display = 'credentialStore';
  this.credential = operationState.input.credential;
  this.showHintChooser = false;
  this.showGreeting = true;
  const promise = new Promise((resolve, reject) => {
    deferredCredentialOperation = {resolve, reject};
  });

  await this.startCredentialFlow();
  return promise;
}

function updateHandlerWindow({webAppWindow}) {
  const self = this;

  if(webAppWindow.popup) {
    // handle user closing popup
    const {dialog} = webAppWindow;
    dialog.addEventListener('close', function abort() {
      // Options for cancelation behavior are:
      // self.cancelSelection -- close handler UI but keep CHAPI UI up
      // self.cancel -- close CHAPI entirely
      self.cancelSelection();
      dialog.removeEventListener('close', abort);
    });
    return;
  }
  const {container, iframe} = webAppWindow.dialog;
  const operation = self.display === 'credentialRequest' ? 'request' : 'store';
  const origin = utils.parseUrl(iframe.src).hostname;
  const Component = Vue.extend(HandlerWindowHeader);
  const el = document.createElement('div');
  container.insertBefore(el, iframe);
  container.classList.add('wrm-slide-up');
  new Component({
    el,
    propsData: {
      origin,
      relyingDomain: self.relyingDomain,
      relyingOrigin: self.relyingOrigin,
      relyingOriginManifest: self.relyingOriginManifest,
      operation,
      hint: self.selectedHint
    },
    created() {
      this.$on('back', self.cancelSelection);
      this.$on('cancel', self.cancel);
    }
  });
  // clear iframe style that was set by web-request-rpc; set instead via CSS
  iframe.style.cssText = null;
  iframe.classList.add('wrm-handler-iframe');
}
