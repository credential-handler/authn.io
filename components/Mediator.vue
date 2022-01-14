<template>
  <div>
    <div v-if="display === 'permissionRequest'">
      <wrm-permission-dialog
        v-if="showPermissionDialog"
        :origin="relyingDomain"
        :permissions="permissions"
        @deny="deny()"
        @allow="allow()" />

      <!-- Note: This wizard is presently only used to create a dialog around
           the AntiTrackingWizard. -->
      <wrm-wizard-dialog
        v-else
        :loading="loading"
        :first="true"
        :has-next="false"
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
          <div />
        </template>
      </wrm-wizard-dialog>
    </div>

    <wrm-wizard-dialog
      v-else-if="!hideWizard &&
        (display === 'credentialRequest' || display === 'credentialStore')"
      :loading="loading"
      :first="showGreeting"
      :has-next="showGreeting || !hasStorageAccess"
      :blocked="loading || (!showGreeting && !selectedHint)"
      @cancel="cancel()"
      @next="nextWizardStep()"
      @back="prevWizardStep()">
      <template slot="header">
        <div style="font-size: 18px; font-weight: bold; user-select: none">
          <div
            v-if="showGreeting"
            style="margin-left: -5px">
            <div v-if="display === 'credentialRequest'">
              Credentials Request
            </div>
            <div v-else>
              Store Credentials
            </div>
          </div>
          <div
            v-else-if="!hasStorageAccess"
            style="margin-left: -10px">
            Authorize Viewing Your Wallet
          </div>
          <div
            v-else
            style="margin-left: -10px">
            <span v-if="selectedHint">Loading Wallet...
              <i class="fas fa-cog fa-spin" />
            </span>
            <span v-else>Choose a Wallet</span>
          </div>
        </div>
      </template>
      <template slot="body">
        <!-- step 1 -->
        <mediator-greeting
          v-if="showGreeting"
          style="user-select: none"
          :display="display"
          :relying-origin="relyingOrigin"
          :relying-origin-manifest="relyingOriginManifest" />

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
          :cancel-remove-hint-timeout="5000"
          :hint-removal-text="hintRemovalText"
          default-hint-icon="fas fa-wallet"
          enable-remove-hint
          @remove-hint="removeHint"
          @confirm="selectHint"
          @cancel="cancel()">
          <template slot="message">
            <div style="padding-top: 10px">
              <div v-if="loading">
                Loading options... <i class="fas fa-cog fa-spin" />
              </div>
              <div
                v-else-if="hintOptions.length === 0"
                style="font-size: 14px">
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
                <div
                  class="wrm-button-bar"
                  style="margin-top: 10px">
                  <button
                    type="button"
                    class="wrm-button wrm-primary"
                    :disabled="loading"
                    @click="cancel()">
                    Close
                  </button>
                </div>
              </div>
            </div>
          </template>
          <template
            v-if="hintOptions.length > 0"
            slot="hint-list-footer">
            <div
              style="margin: 10px -15px 0px -15px; padding: 15px 15px 0px 15px;"
              class="wrm-separator wrm-modern">
              <wrm-checkbox
                v-model="rememberChoice"
                checkbox-class="wrm-blue"
                checkbox-style="font-size: 14px"
                label="Remember my choice for this site"
                label-class="wrm-dark-gray" />
            </div>
          </template>
        </wrm-hint-chooser>
        <div
          v-else-if="selectedHint"
          style="padding-top: 15px">
          <wrm-hint
            :hint="selectedHint"
            default-icon="fas fa-wallet"
            :active="true"
            :selected="true"
            :selectable="false"
            :disabled="true" />
        </div>
      </template>
      <template
        v-if="!showGreeting"
        slot="footer">
        <!-- clear footer after first step -->
        <div />
      </template>
    </wrm-wizard-dialog>
  </div>
</template>

<script>
/*!
 * New BSD License (3-clause)
 * Copyright (c) 2017-2021, Digital Bazaar, Inc.
 * All rights reserved.
 */
import * as polyfill from 'credential-mediator-polyfill';
import {getSiteChoice, setSiteChoice} from './siteChoice.js';
import {getWebAppManifest} from './manifest.js';
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
  data() {
    return {
      rememberChoice: true,
      display: null,
      hasStorageAccess: false,
      hideWizard: false,
      hintOptions: [],
      hintRemovalText: 'Hiding...',
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
  computed: {
    relyingOriginName() {
      if(!this.relyingOriginManifest) {
        return this.relyingDomain;
      }
      const {name, short_name} = this.relyingOriginManifest;
      return name || short_name || this.relyingDomain;
    }
  },
  async created() {
    this.relyingOrigin = utils.parseUrl(document.referrer).origin;
    this.relyingDomain = utils.parseUrl(this.relyingOrigin).host;

    // TODO: is this the appropriate place to run this?
    loadPolyfill(this);

    // attempt to load web app manifest icon
    const manifest = await getWebAppManifest(this.relyingDomain);
    this.relyingOriginManifest = manifest;
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
      let recommendedHandlerOrigins;
      if(this.credentialRequestOptions) {
        // get matching hints from request options
        hintOptions = await navigator.credentialMediator.ui
          .matchCredentialRequest(this.credentialRequestOptions);
        ({web: {recommendedHandlerOrigins = []}} =
          this.credentialRequestOptions);
      } else {
        // must be a storage request, get hints that match credential
        hintOptions = await navigator.credentialMediator.ui
          .matchCredential(this.credential);
        ({options: {recommendedHandlerOrigins = []} = {}} = this.credential);
      }

      // no available hints, check for recommended options
      if(hintOptions.length === 0 && Array.isArray(recommendedHandlerOrigins)) {
        // get relevant types to match against handler
        let types = [];
        if(this.credentialRequestOptions) {
          // types are all capitalized `{web: {Type1, Type2, ..., TypeN}}`
          types = Object.keys(this.credentialRequestOptions.web)
            .filter(k => k[0] === k.toUpperCase()[0]);
        } else {
          types.push(this.credential.dataType);
        }

        // maximum of 3 recommended handlers
        recommendedHandlerOrigins = recommendedHandlerOrigins.slice(0, 3);
        const jitHints = (await Promise.all(recommendedHandlerOrigins.map(
          async recommendedOrigin => {
            if(typeof recommendedOrigin !== 'string') {
              return;
            }
            const {host, origin} = utils.parseUrl(recommendedOrigin);
            const manifest = (await getWebAppManifest(host)) || {};
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
                  name: this.relyingOriginName,
                  origin: this.relyingOrigin,
                  manifest: this.relyingOriginManifest,
                  domain: this.relyingDomain
                }
              }
            };
          }))).filter(e => !!e);
        this.hintOptions = jitHints;
        return;
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
    async removeHint(event) {
      const {hint} = event;
      const idx = this.hintOptions.indexOf(hint);
      this.hintOptions.splice(idx, 1);
      if(this.hintOptions.length === 0) {
        this.loading = true;
      }
      await navigator.credentialMediator.ui.unregisterCredentialHandler(
        hint.hintOption.credentialHandler);
      if(this.hintOptions.length === 0) {
        // load hints again to use recommended handler origins if present
        // and include a slight delay to avoid flash of content
        await new Promise(r => setTimeout(r, 1000));
        await this.loadHints();
        this.loading = false;
      }
    },
    async selectHint(event) {
      this.selectedHint = event.hint;
      let _resolve;
      event.waitUntil(new Promise(r => _resolve = r));

      let {credentialHandler} = event.hint.hintOption;

      // auto-register handler if hint was JIT-created
      if(event.hint.jit) {
        const {name, manifest: {credential_handler: {enabledTypes}}} =
          event.hint;
        await navigator.credentialMediator.ui.registerCredentialHandler(
          credentialHandler, {name, enabledTypes, icons: []});
      }

      // save choice for site
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
        if(!response) {
          // clear site choice when `null` response is returned by credential
          // handler
          setSiteChoice({relyingOrigin, credentialHandler: null});
        }
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
        this.rememberChoice = true;
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
      this.rememberChoice = true;
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

async function requestPermission(/*permissionDesc*/) {
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
  handlerWindow.iframe.style.cssText = null;
  handlerWindow.iframe.classList.add('wrm-handler-iframe');
}

</script>

<style>
</style>
