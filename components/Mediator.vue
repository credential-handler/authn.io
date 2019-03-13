<template>
  <div>
    <div v-if="display === 'permissionRequest'">
      <wrm-permission-dialog v-if="showPermissionDialog"
        :origin="relyingDomain"
        :permissions="permissions"
        @deny="deny()" @allow="allow()"/>

      <!-- Note: This wizard is presently only used to create a dialog around
           the AntiTrackingWizard. -->
      <wrm-wizard-dialog v-else
        :loading="loading"
        :first="true"
        :hasNext="false"
        :blocked="loading"
        @cancel="deny()">
        <template slot="header">
          <div style="font-size: 16px; padding-top: 6px; user-select: none">
            Authorize Credential Wallet
          </div>
        </template>
        <template slot="body">
          <anti-tracking-wizard
            @cancel="cancel()"
            @finish="finishAntiTrackingWizard()" />
        </template>
        <template slot="footer">
          <!-- do not show footer -->
          <div></div>
        </template>
      </wrm-wizard-dialog>
    </div>

    <wrm-wizard-dialog v-else-if="!hideWizard &&
      (display === 'credentialRequest' || display === 'credentialStore')"
      :loading="loading"
      :first="showGreeting"
      :hasNext="showGreeting || !hasStorageAccess"
      :blocked="loading || (!showGreeting && !selectedHint)"
      @cancel="cancel()"
      @next="nextWizardStep()"
      @back="prevWizardStep()">
      <template slot="header">
        <div style="font-size: 18px; font-weight: bold; user-select: none">
          <div v-if="showGreeting" style="margin-left: -5px">
            <div v-if="display === 'credentialRequest'">
              Credentials Request
            </div>
            <div v-else>
              Store Credentials
            </div>
          </div>
          <div v-else-if="!hasStorageAccess" style="margin-left: -10px">
            Authorize Viewing Your Wallet
          </div>
          <div v-else style="margin-left: -10px">
            <span v-if="selectedHint">Loading Wallet...
              <i class="fas fa-cog fa-spin"></i>
            </span>
            <span v-else>Choose a Wallet</span>
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
        <div v-else-if="!hasStorageAccess && !showHintChooser">
          <anti-tracking-wizard
            @cancel="cancel()"
            @finish="finishAntiTrackingWizard()" />
        </div>

        <!-- step 3 -->
        <wrm-hint-chooser
          v-else-if="showHintChooser"
          style="user-select: none"
          :hints="hintOptions"
          default-hint-icon="fas fa-wallet"
          @confirm="selectHint"
          @cancel="cancel()">
          <template slot="message">
            <div style="padding-top: 10px">
              <div v-if="loading">
                Loading options... <i class="fas fa-cog fa-spin"></i>
              </div>
              <div v-if="hintOptions.length === 0" style="font-size: 14px">
                <div style="font-weight: bold">
                  Warning
                </div>
                <div v-if="display === 'credentialRequest'">
                  <p>
                    You don't have the credentials requested by this website.
                    Please check <strong>{{relyingOriginName}}</strong> to find
                    out how to obtain the credentials you need to continue.
                  </p>
                  <p>
                    It may also be that your browser has unregistered your
                    credential wallet. This does not mean your credentials have
                    been removed or lost. Please simply visit your credential
                    wallet website to register again.
                  </p>
                </div>
                <div v-else>
                  <p>
                    You don't have a credential wallet to store credentials or
                    your browser has recently unregistered your wallet. This
                    does not mean your credentials have been removed or lost.
                    Please simply visit your credential wallet website to
                    register again.
                  </p>
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
        <div v-else-if="selectedHint" style="padding-top: 15px">
          <wrm-hint
            :hint="selectedHint"
            default-icon="fas fa-wallet"
            :active="true"
            :selected="true"
            :selectable="false"
            :disabled="true" />
        </div>
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
import {getSiteChoice, setSiteChoice} from './siteChoice.js';
import {getWebAppManifestIcon} from 'vue-web-request-mediator';
import {hasStorageAccess, requestStorageAccess} from 'web-request-mediator';
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
      hasStorageAccess: false,
      hideWizard: false,
      hintOptions: [],
      loading: false,
      permissions: [{
        name: 'Manage credentials',
        icon: 'fas fa-id-card'
      }],
      relyingDomain: null,
      relyingOrigin: null,
      relyingOriginManifest: null,
      selectedHint: null,
      showHintChooser: false,
      showGreeting: false,
      showPermissionDialog: false
    };
  },
  methods: {
    async allow() {
      this.hasStorageAccess = await requestStorageAccess();
      if(this.hasStorageAccess) {
        resolvePermissionRequest('granted');
        this.reset();
        await navigator.credentialMediator.hide();
        return;
      }

      // must go through wizard
      this.showPermissionDialog = false;
    },
    async deny() {
      await requestStorageAccess();
      resolvePermissionRequest('denied');
      this.reset();
      await navigator.credentialMediator.hide();
    },
    async cancelSelection() {
      this.hideWizard = false;
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
      const mustLoadHints = !this.hasStorageAccess;
      // always call `requestStorageAccess` to refresh mediator's
      // user interaction timestamp
      this.hasStorageAccess = await requestStorageAccess();
      if(this.hasStorageAccess) {
        if(mustLoadHints) {
          await this.loadHints();
        }
        this.useRememberedHint();
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
      this.hasStorageAccess = await requestStorageAccess();
      if(this.display === 'permissionRequest') {
        if(this.hasStorageAccess) {
          await this.allow();
        } else {
          await this.deny();
        }
      } else {
        if(this.hasStorageAccess) {
          await this.loadHints();
          this.useRememberedHint();
        } else {
          // can't get access for some reason, show hint chooser w/no hints
          this.showHintChooser = true;
        }
      }
      this.loading = false;
    },
    async loadHints() {
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
    },
    useRememberedHint({hideWizard = false, showHintChooser = true} = {}) {
      // check to see if there is a reusable choice for the relying party
      const {hintOptions, relyingOrigin} = this;
      const hint = getSiteChoice({relyingOrigin, hintOptions});
      if(hint) {
        this.showGreeting = false;
        this.hideWizard = hideWizard;
        this.rememberChoice = true;
        this.selectHint({
          hint,
          waitUntil() {}
        });
      } else {
        this.showHintChooser = showHintChooser;
      }
    },
    async selectHint(event) {
      this.selectedHint = event.hint;
      let _resolve;
      event.waitUntil(new Promise(r => _resolve = r));

      // save choice for site
      let {credentialHandler} = event.hint.hintOption;
      if(!this.rememberChoice) {
        credentialHandler = null;
      }
      const {relyingOrigin} = this;
      setSiteChoice({relyingOrigin, credentialHandler});

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
        this.rememberChoice = false;
        // clear site choice
        setSiteChoice({relyingOrigin, credentialHandler: null});
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
    async startFlow() {
      this.loading = true;

      // load hints early if possible to avoid showing UI
      this.hasStorageAccess = await hasStorageAccess();
      if(this.hasStorageAccess) {
        await this.loadHints();
        // this will cause a remembered hint to execute immediately without
        // showing the greeting dialog
        this.useRememberedHint({
          // to hide the wizard dialog completely when a remembered hint is
          // loading (i.e. do not even show a loading hint), change
          // `hintWizard` to `true`
          hideWizard: false,
          showHintChooser: false
        });
      }

      // show display
      await navigator.credentialMediator.show();

      this.loading = false;
    },
    reset() {
      this.display = null;
      this.credentialRequestOptions = this.credential = null;
      this.hasStorageAccess = false;
      this.hideWizard = false;
      this.hintOptions = [];
      this.loading = false;
      this.rememberChoice = false;
      this.selectedHint = null;
      this.showHintChooser = false;
      this.showGreeting = false;
      this.showPermissionDialog = false;
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

  // show display
  this.showPermissionDialog = true;
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

  await this.startFlow();

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

  await this.startFlow();

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
