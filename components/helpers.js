import {getWebAppManifest} from './manifest.js';
import * as polyfill from 'credential-mediator-polyfill';
import {getWebAppManifestIcon} from 'vue-web-request-mediator';
import {utils} from 'web-request-rpc';
import HandlerWindowHeader from './HandlerWindowHeader.vue';
import Vue from 'vue';

let deferredCredentialOperation;
let resolvePermissionRequest;

export function getDeferredCredentialOperation() {
  return deferredCredentialOperation;
}

export function getResolvePermissinoRequest() {
  return resolvePermissionRequest;
}

export function createWebShareData({credential, credentialRequestOrigin}) {
  const payload = {credential, credentialRequestOrigin};
  const blob = new Blob(
    [JSON.stringify(payload, null, 2)],
    {type: 'text/plain'});
  const file = new File([blob], 'SharedCredentialRequest.txt',
    {type: 'text/plain'});

  const data = {files: [file]};
  return {data};
}

export async function webShareHasFileSupport({data}) {
  // Check if WebShare API with files is supported
  if(navigator.canShare && navigator.canShare({files: data.files})) {
    console.log('WebShare API with files is supported, sharing...');
    navigator.share(data)
      .then(result => {
        console.log('result:', result);
      })
      .catch(err => {
        console.log('Error during WebShare:', err);
      });
  } else {
    console.log('Sharing files through WebShare API not supported.');
  }
}

export function parseUrl({url}) {
  const {origin} = utils.parseUrl(url);
  const {host} = utils.parseUrl(origin);

  return {origin, host};
}

export async function autoRegisterHint({event, credentialHandler}) {
  const {name, manifest: {credential_handler: {enabledTypes}}} =
  event.hint;
  await navigator.credentialMediator.ui.registerCredentialHandler(
    credentialHandler, {name, enabledTypes, icons: []});
}

export async function createHintOptions({handlers}) {
  return Promise.all(handlers.map(
    async credentialHandler => {
      const {origin, host} = utils.parseUrl(credentialHandler);
      const manifest = (await getWebAppManifest({host})) || {};
      const name = manifest.name || manifest.short_name || host;
      // if `manifest.credential_handler` is set, update registration
      // to use it if it doesn't match already
      // TODO: consider also updating if `enabledTypes` does not match
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
      // get updated name and icons
      let icon = getWebAppManifestIcon({manifest, origin, size: 32});
      if(icon) {
        icon = {fetchedImage: icon.src};
      }
      return {
        name,
        icon,
        origin,
        host,
        manifest,
        hintOption: {
          credentialHandler,
          credentialHintKey: null
        }
      };
    }));
}

export async function createJitHints({
  recommendedHandlerOrigins, types, relyingOriginName, relyingOrigin,
  relyingOriginManifest, relyingDomain
}) {
  return Promise.all(recommendedHandlerOrigins.map(
    async recommendedOrigin => {
      if(typeof recommendedOrigin !== 'string') {
        return;
      }
      const {host, origin} = utils.parseUrl(recommendedOrigin);
      const manifest = (await getWebAppManifest({host})) || {};
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
        credentialHandler = new URL(
          manifest.credential_handler.url, origin).href;
      } catch(e) {
        console.error(e);
        return;
      }
      return {
        name,
        icon,
        origin,
        host,
        manifest,
        hintOption: {
          credentialHandler,
          credentialHintKey: null
        },
        jit: {
          recommendedBy: {
            name: relyingOriginName,
            origin: relyingOrigin,
            manifest: relyingOriginManifest,
            domain: relyingDomain
          }
        }
      };
    }));
}

export async function loadPolyfill(component, rpcServices = {}) {
  try {
    await polyfill.loadOnce({
      relyingOrigin: component.relyingOrigin,
      requestPermission: requestPermission.bind(component),
      getCredential: getCredential.bind(component),
      storeCredential: storeCredential.bind(component),
      customizeHandlerWindow({webAppWindow}) {
        updateHandlerWindow.bind(component)(webAppWindow);
      },
      rpcServices,
    });
  } catch(e) {
    console.error('this boom right here', e);
  }
}

export async function requestPermission(/*permissionDesc*/) {
  // prep display
  this.display = 'permissionRequest';
  const promise = new Promise(resolve => {
    resolvePermissionRequest = state => resolve({state});
  });

  // show display
  this.showPermissionDialog = true;
  await navigator.credentialMediator.show();
  return promise;
}

export async function getCredential(operationState) {
  // prep display
  this.display = 'credentialRequest';
  this.credentialRequestOptions = operationState.input.credentialRequestOptions;
  this.showHintChooser = false;
  this.showGreeting = true;
  const promise = new Promise((resolve, reject) => {
    deferredCredentialOperation = {resolve, reject};
  });

  await this.startFlow();

  return promise;
}

export async function storeCredential(operationState) {
  // prep display
  this.display = 'credentialStore';
  this.credential = operationState.input.credential;
  this.showHintChooser = false;
  this.showGreeting = true;
  const promise = new Promise((resolve, reject) => {
    deferredCredentialOperation = {resolve, reject};
  });

  await this.startFlow();

  return promise;
}

export function updateHandlerWindow(handlerWindow) {
  console.log('AAAAAAA handlerWindow', handlerWindow);
  if(handlerWindow.popup) {
    return;
  }
  const self = this;
  const {container, iframe} = handlerWindow.dialog;
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
