<template>
  <div>
    <div v-if="display === 'permissionRequest'">
      <wrm-permission-dialog
        :origin="relyingDomain"
        :permissions="permissions"
        @deny="deny()" @allow="accept()"/>
    </div>

    <div v-else-if="display === 'credentialRequest'">
      <wrm-hint-chooser
        :hints="hintOptions"
        default-hint-icon="fa-user-circle"
        :confirm-button="needsStorageAccess"
        @confirm="selectHint"
        @cancel="cancel()"
        @load-hints="$event.waitUntil(loadHints())">
        <template slot="header">
          <wrm-origin-card
            :origin="relyingOrigin"
            :manifest="relyingOriginManifest">
            <template slot="task">You are sending credentials to</template>
          </wrm-origin-card>
        </template>
        <template slot="message">
          <div v-if="loading" style="padding: 10px 0">
            Loading options... <i class="fa fa-circle-o-notch fa-spin"></i>
          </div>
          <div v-else-if="!needsStorageAccess" style="padding: 2px 0">
            <div v-if="hintOptions.length === 0">
              <div class="wrm-heading">Warning</div>
              <div>
                You don't have the credentials requested by this website.
                Please check <strong>{{relyingOriginName}}</strong> to find out
                how to obtain the credentials you need to continue.
              </div>
            </div>
            <div v-else class="wrm-heading">
              Choose a credential wallet to continue
            </div>
          </div>
        </template>
      </wrm-hint-chooser>
    </div>

    <div v-else-if="display === 'credentialStore'">
      <wrm-hint-chooser
        :hints="hintOptions"
        default-hint-icon="fa-user-circle"
        :confirm-button="needsStorageAccess"
        @confirm="selectHint"
        @cancel="cancel()"
        @load-hints="$event.waitUntil(loadHints())">
        <template slot="header">
          <wrm-origin-card
            :origin="relyingOrigin"
            :manifest="relyingOriginManifest">
            <template slot="task">You are receiving credentials from</template>
          </wrm-origin-card>
        </template>
        <template slot="message">
          <div v-if="loading" style="padding: 10px 0">
            Loading options... <i class="fa fa-circle-o-notch fa-spin"></i>
          </div>
          <div v-else-if="!needsStorageAccess" style="padding: 2px 0">
            <div v-if="hintOptions.length === 0">
              You don't have a digital wallet to store credentials. Please
              visit a digital wallet website to install one.
            </div>
            <div v-else class="wrm-heading">
              Choose a credential wallet to continue
            </div>
          </div>
        </template>
      </wrm-hint-chooser>
    </div>
  </div>
</template>
<script>
/*!
 * New BSD License (3-clause)
 * Copyright (c) 2017-2018, Digital Bazaar, Inc.
 * All rights reserved.
 */
/* global navigator */
'use strict';

import * as polyfill from 'credential-mediator-polyfill';
import axios from 'axios';
import {getWebAppManifestIcon} from 'vue-web-request-mediator';
import {utils} from 'web-request-rpc';
import HandlerWindowHeader from './HandlerWindowHeader.vue';
import Vue from 'vue';

let deferredCredentialOperation;
let resolvePermissionRequest;

export default {
  name: 'Mediator',
  async created() {
    if(window.location.ancestorOrigins &&
      window.location.ancestorOrigins.length > 0) {
      this.relyingOrigin = window.location.ancestorOrigins[0];
    } else {
      const {origin} = this.$route.query;
      this.relyingOrigin = origin;
    }

    this.relyingDomain = utils.parseUrl(this.relyingOrigin).hostname;

    // TODO: is this the appropriate place to run this?
    loadPolyfill(this);

    // attempt to load web app manifest icon
    const manifest = await getWebAppManifest(this.relyingDomain);
    this.relyingOriginManifest = manifest;
  },
  computed: {
    relyingOriginName() {
      if(!this.relyingOriginManifest) {
        return this.relyingDomain;
      }
      const {name, short_name} = this.relyingOriginManifest;
      return name || short_name || this.relyingDomain;
    }
  },
  data() {
    return {
      display: null,
      hintOptions: [],
      loading: false,
      needsStorageAccess: false,
      permissions: [{
        name: 'Manage credentials',
        icon: 'fa fa-id-card-o'
      }],
      relyingDomain: null,
      relyingOrigin: null,
      relyingOriginManifest: null,
      selectedHint: null
    };
  },
  methods: {
    async accept() {
      resolvePermissionRequest('granted');
      this.reset();
      await navigator.credentialMediator.hide();
    },
    async deny() {
      resolvePermissionRequest('denied');
      this.reset();
      await navigator.credentialMediator.hide();
    },
    async cancelSelection() {
      await navigator.credentialMediator.ui.cancelSelectCredentialHint();
    },
    async cancel() {
      if(this.selectedHint) {
        await this.cancelSelection();
      }
      this.reset();
      deferredCredentialOperation.resolve(null);
      await navigator.credentialMediator.hide();
    },
    async loadHints() {
      if(typeof document.hasStorageAccess === 'function') {
        this.needsStorageAccess = !await document.hasStorageAccess();
      } else {
        this.needsStorageAccess = false;
      }

      if(this.needsStorageAccess) {
        this.hintOptions = [];
        return;
      }

      let hintOptions;
      if(this.credentialRequestOptions) {
        // get matching hints from request options
        hintOptions = await navigator.credentialMediator.ui
          .matchCredentialRequest(this.credentialRequestOptions);
      } else {
        // must be a storage request, get hints that match credential
        hintOptions = await navigator.credentialMediator.ui
          .matchCredential(this.credential);
      }

      // get unique credential handlers
      const handlers = [...new Set(hintOptions.map(
        ({credentialHandler}) => credentialHandler))];
      // create hints for each unique origin
      this.hintOptions = await Promise.all(handlers.map(
        async credentialHandler => {
          const origin = utils.parseUrl(credentialHandler).hostname;
          const manifest = (await getWebAppManifest(origin)) || {};
          const name = manifest.name || manifest.short_name || origin;
          let icon = getWebAppManifestIcon({manifest, origin, size: 32});
          if(icon) {
            icon = {fetchedImage: icon.src};
          }
          return {
            name,
            icon,
            origin,
            hintOption: {
              credentialHandler,
              credentialHintKey: null
            }
          };
        }));
    },
    async selectHint(event) {
      this.selectedHint = event.hint;
      let _resolve;
      event.waitUntil(new Promise(r => _resolve = r));

      let canceled = false;
      let response;
      try {
        response = await navigator.credentialMediator.ui.selectCredentialHint(
          event.hint.hintOption);
        deferredCredentialOperation.resolve(response);
      } catch(e) {
        if(e.name === 'AbortError') {
          canceled = true;
        } else {
          console.error(e);
          deferredCredentialOperation.reject(e);
        }
      }

      if(canceled) {
        this.selectedHint = null;
      } else {
        try {
          this.reset();
          await navigator.credentialMediator.hide();
        } catch(e) {
          console.error(e);
        }
      }

      _resolve();
    },
    reset() {
      this.display = null;
      this.credentialRequestOptions = this.credential = null;
      this.hintOptions = [];
      this.loading = false;
      this.selectedHint = null;
    }
  }
};

async function loadPolyfill(component) {
  try {
    await polyfill.loadOnce({
      relyingOrigin: component.relyingOrigin,
      requestPermission: requestPermission.bind(component),
      getCredential: getCredential.bind(component),
      storeCredential: storeCredential.bind(component),
      customizeHandlerWindow({webAppWindow}) {
        updateHandlerWindow.bind(component)(webAppWindow);
      }
    });
  } catch(e) {
    console.error(e);
  }
}

async function requestPermission(permissionDesc) {
  // prep display
  this.display = 'permissionRequest';
  const promise = new Promise(resolve => {
    resolvePermissionRequest = state => resolve({state});
  });

  // show display and return promise
  await navigator.credentialMediator.show();
  return promise;
}

async function getCredential(operationState) {
  // prep display
  this.display = 'credentialRequest';
  this.credentialRequestOptions = operationState.input.credentialRequestOptions;
  this.loading = true;
  const promise = new Promise((resolve, reject) => {
    deferredCredentialOperation = {resolve, reject};
  });

  // show display
  await navigator.credentialMediator.show();

  await this.loadHints();
  this.loading = false;

  return promise;
}

async function storeCredential(operationState) {
  // prep display
  this.display = 'credentialStore';
  this.credential = operationState.input.credential;
  this.loading = true;
  const promise = new Promise((resolve, reject) => {
    deferredCredentialOperation = {resolve, reject};
  });

  // show display
  await navigator.credentialMediator.show();

  await this.loadHints();
  this.loading = false;

  return promise;
}

function updateHandlerWindow(handlerWindow) {
  const self = this;
  const container = handlerWindow.container;
  const operation = self.display === 'credentialRequest' ? 'request' : 'store';
  const origin = utils.parseUrl(handlerWindow.iframe.src).hostname;
  const Component = Vue.extend(HandlerWindowHeader);
  const el = document.createElement('div');
  container.insertBefore(el, handlerWindow.iframe);
  new Component({
    el,
    propsData: {
      origin,
      relyingDomain: self.relyingDomain,
      operation,
      hint: self.selectedHint
    },
    created() {
      this.$on('cancel', self.cancelSelection);
    }
  });
  // TODO: should this be done?
  handlerWindow.iframe.style.background = 'white';
}

async function getIcon(origin) {
  // TODO: fetch web manifest for credentialHint.origin
  console.log('get icon for origin', origin);
  const manifest = await getWebAppManifest(origin);
  const icon = getWebAppManifestIcon({manifest, origin, size: 32});
  if(icon) {
    return {fetchedImage: icon.src};
  }
  return icon;
}

async function getWebAppManifest(origin) {
  try {
    const response = await axios.get('/manifest', {params: {origin}});
    return response.data;
  } catch(e) {
    return null;
  }
}

</script>
<style>
</style>
