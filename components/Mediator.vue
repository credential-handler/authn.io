<template>
  <div>
    <div v-if="display === 'permissionRequest'">
      <wrm-permission-dialog
        :origin="relyingDomain"
        :permissions="permissions"
        @deny="deny()" @allow="accept()"/>
    </div>

    <wrm-wizard-dialog v-else-if="display === 'credentialRequest' ||
      display === 'credentialStore'"
      :loading="loading"
      :first="showGreeting"
      :hasNext="showGreeting || needsStorageAccess"
      :blocked="loading || (!showGreeting && !selectedHint)"
      @cancel="cancel()"
      @next="nextWizardStep()"
      @back="prevWizardStep()">
      <template slot="header">
        <div style="font-size: 16px; padding-top: 6px; user-select: none">
          <div v-if="showGreeting" style="margin-left: -5px">
            <div v-if="display === 'credentialRequest'">
              Credentials Request
            </div>
            <div v-else>
              Store Credentials
            </div>
          </div>
          <div v-else-if="needsStorageAccess" style="margin-left: -10px">
            Authorize Viewing Your Wallet
          </div>
          <div v-else style="margin-left: -10px">
            Choose a Wallet
          </div>
        </div>
      </template>
      <template slot="body">
        <!-- step 1 -->
        <mediator-greeting v-if="showGreeting"
          style="user-select: none"
          :display="display"
          :relyingOrigin="relyingOrigin"
          :relyingOriginManifest="relyingOriginManifest" />

        <!-- optional step 2 -->
        <div v-else-if="needsStorageAccess">
          <anti-tracking-wizard
            @cancel="cancel()"
            @finish="finishAntiTrackingWizard()" />
        </div>

        <!-- step 3 -->
        <wrm-hint-chooser
          v-else-if="showHintChooser"
          style="user-select: none"
          :hints="hintOptions"
          default-hint-icon="fa-wallet"
          @confirm="selectHint"
          @cancel="cancel()">
          <template slot="message">
            <div style="padding-top: 10px">
              <div v-if="loading">
                Loading options... <i class="fas fa-cog fa-spin"></i>
              </div>
              <div v-if="hintOptions.length === 0" style="font-size: 14px">
                <div style="font-weight: bold; padding-bottom: 10px">
                  Warning
                </div>
                <div v-if="display === 'credentialRequest'">
                  You don't have the credentials requested by this website.
                  Please check <strong>{{relyingOriginName}}</strong> to find out
                  how to obtain the credentials you need to continue.
                </div>
                <div v-else>
                  You don't have a credential wallet to store credentials.
                  Please visit a credential wallet website to install one.
                </div>
                <div class="wrm-button-bar" style="margin-top: 10px">
                  <button type="button" class="wrm-button wrm-primary"
                    :disabled="loading"
                    @click="cancel()">
                    Close
                  </button>
                </div>
              </div>
            </div>
          </template>
          <template slot="hint-list-footer" v-if="hintOptions.length > 0">
            <div
              style="margin: 10px -15px 0px -15px; padding: 15px 15px 0px 15px;"
              class="wrm-separator wrm-modern">
              <wrm-checkbox
                checkbox-class="wrm-blue"
                checkbox-style="font-size: 14px"
                label="Remember my choice for this site"
                label-class="wrm-dark-gray"
                v-model="rememberChoice" />
            </div>
          </template>
        </wrm-hint-chooser>
      </template>
      <template slot="footer" v-if="!showGreeting">
        <!-- clear footer after first step -->
        <div></div>
      </template>
    </wrm-wizard-dialog>
  </div>
</template>
<script>
/*!
 * New BSD License (3-clause)
 * Copyright (c) 2017-2019, Digital Bazaar, Inc.
 * All rights reserved.
 */
/* global navigator */
'use strict';

import * as polyfill from 'credential-mediator-polyfill';
import axios from 'axios';
import {getSessionChoice, setSessionChoice} from './sessionChoice.js';
import {getWebAppManifestIcon} from 'vue-web-request-mediator';
import {utils} from 'web-request-rpc';
import AntiTrackingWizard from './AntiTrackingWizard.vue';
import HandlerWindowHeader from './HandlerWindowHeader.vue';
import MediatorGreeting from './MediatorGreeting.vue';
import Vue from 'vue';

let deferredCredentialOperation;
let resolvePermissionRequest;

export default {
  name: 'Mediator',
  components: {AntiTrackingWizard, MediatorGreeting},
  async created() {
    if(window.location.ancestorOrigins &&
      window.location.ancestorOrigins.length > 0) {
      this.relyingOrigin = window.location.ancestorOrigins[0];
    } else {
      const {origin} = this.$route.query;
      this.relyingOrigin = origin;
    }

    this.relyingDomain = utils.parseUrl(this.relyingOrigin).host;

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
      rememberChoice: false,
      display: null,
      hintOptions: [],
      loading: false,
      needsStorageAccess: false,
      permissions: [{
        name: 'Manage credentials',
        icon: 'fas fa-id-card'
      }],
      relyingDomain: null,
      relyingOrigin: null,
      relyingOriginManifest: null,
      selectedHint: null,
      showHintChooser: false,
      showGreeting: false
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
    async nextWizardStep() {
      this.loading = true;
      if(this.needsStorageAccess) {
        this.needsStorageAccess = !await document.requestStorageAccess();
      }
      this.showGreeting = false;
      this.loading = false;
    },
    async prevWizardStep() {
      this.showGreeting = true;
      if(this.selectedHint) {
        await this.cancelSelection();
      }
    },
    async finishAntiTrackingWizard() {
      this.loading = true;
      this.needsStorageAccess = !await document.requestStorageAccess();
      if(this.needsStorageAccess) {
        // still can't get access for some reason
        this.hintOptions = [];
        this.needsStorageAccess = false;
        this.showHintChooser = true;
        this.loading = false;
        return;
      }
      await this.loadHints();
      this.loading = false;
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
          const {origin, host} = utils.parseUrl(credentialHandler);
          const manifest = (await getWebAppManifest(host)) || {};
          const name = manifest.name || manifest.short_name || host;
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

      // check to see if there is a reusable choice from this session
      const hint = getSessionChoice({hintOptions: this.hintOptions});
      if(hint) {
        this.selectHint({
          hint,
          waitUntil() {}
        });
      } else {
        this.showHintChooser = true;
      }
    },
    async selectHint(event) {
      this.selectedHint = event.hint;
      let _resolve;
      event.waitUntil(new Promise(r => _resolve = r));

      // save choice for session
      let {credentialHandler} = event.hint.hintOption;
      if(!this.rememberChoice) {
        credentialHandler = null;
      }
      setSessionChoice({credentialHandler});

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
        // clear session choice
        setSessionChoice({credentialHandler: null});
        this.showHintChooser = true;
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
      this.showHintChooser = false;
      this.needsStorageAccess = false;
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
  this.showHintChooser = false;
  this.showGreeting = true;
  const promise = new Promise((resolve, reject) => {
    deferredCredentialOperation = {resolve, reject};
  });

  this.loading = true;

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
  this.showHintChooser = false;
  this.showGreeting = true;
  const promise = new Promise((resolve, reject) => {
    deferredCredentialOperation = {resolve, reject};
  });

  this.loading = true;

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
  handlerWindow.iframe.style.cssText = null;
}

async function getWebAppManifest(host) {
  try {
    const response = await axios.get('/manifest', {params: {host}});
    return response.data;
  } catch(e) {
    return null;
  }
}

</script>
<style>
</style>
