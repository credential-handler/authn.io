<template>
  <div v-if="!display" />
  <wrm-wizard-dialog
    v-else
    :loading="loading"
    :first="showGreeting"
    :has-next="showGreeting"
    :blocked="loading || (!showGreeting && !selectedHint)"
    @cancel="cancel()"
    @next="nextWizardStep()"
    @back="prevWizardStep()">
    <template slot="header">
      <div style="font-size: 18px; font-weight: bold; user-select: none">
        <div
          v-if="showGreeting"
          style="margin-left: -5px">
          <div v-if="display === 'permissionRequest'">
            Allow Wallet
            <i
              v-if="loading"
              class="fas fa-cog fa-spin" />
          </div>
          <div v-else-if="display === 'credentialRequest'">
            {{showHintChooser ? 'Choose a Wallet' : 'Credentials Request'}}
            <i
              v-if="loading"
              class="fas fa-cog fa-spin" />
          </div>
          <div v-else>
            {{showHintChooser ? 'Choose a Wallet' : 'Store Credentials'}}
            <i
              v-if="loading"
              class="fas fa-cog fa-spin" />
          </div>
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
        :icon-size="greetingIconSize"
        :relying-origin="relyingOrigin"
        :relying-origin-manifest="relyingOriginManifest" />

      <!-- step 2 request/store iframe -->
      <div v-if="showGreeting && showHintChooser">
        <div class="wrm-modal-content-header" />
      </div>
      <wrm-hint-chooser
        v-if="showHintChooser"
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
          <!-- FIXME: do not show this button if WebShare is not available -->
          <div
            class="wrm-button-bar"
            style="margin: auto; padding-top: 1em;">
            <button
              type="button"
              class="wrm-button"
              style="margin: auto"
              :disabled="loading"
              @click="webShare()">
              Select Native App Instead
            </button>
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
        <!-- FIXME: do not show this button on mobile; it has no effect -->
        <div
          v-if="popupOpen"
          class="wrm-button-bar"
          style="margin: auto; margin-top: 1em">
          <button
            type="button"
            class="wrm-button wrm-primary"
            style="margin: auto"
            @click="focusPopup()">
            Show Wallet
          </button>
        </div>
      </div>
    </template>
    <template
      v-if="hasCustomFooter"
      slot="footer">
      <!-- clear footer when greeting not shown / show with hint chooser -->
      <div v-if="!showGreeting || showHintChooser" />
      <div
        v-else-if="display === 'permissionRequest' && !popupOpen"
        class="wrm-button-bar"
        style="margin-top: 10px">
        <button
          type="button"
          class="wrm-button"
          @click="deny()">
          Block
        </button>
        <span style="margin-right: 5px" />
        <button
          type="button"
          class="wrm-button"
          @click="allow()">
          Allow
        </button>
      </div>
      <!-- FIXME: do not show this button on mobile; it has no effect -->
      <div
        v-else-if="popupOpen && display !== 'permissionRequest'"
        class="wrm-button-bar"
        style="margin: auto; margin-top: 1em">
        <button
          type="button"
          class="wrm-button wrm-primary"
          style="margin: auto"
          @click="focusPopup()">
          Show Wallet Chooser
        </button>
      </div>
    </template>
  </wrm-wizard-dialog>
</template>

<script>
/*!
 * New BSD License (3-clause)
 * Copyright (c) 2017-2023, Digital Bazaar, Inc.
 * All rights reserved.
 */
import {
  autoRegisterHint,
  openAllowWalletWindow,
  openCredentialHintWindow,
  parseUrl
} from '../helpers.js';
import {
  getDeferredCredentialOperation,
  getResolvePermissionRequest,
  loadPolyfill
} from '../mediatorPolyfill.js';
import {getSiteChoice, hasSiteChoice, setSiteChoice} from '../siteChoice.js';
import {getWebAppManifest} from '../manifest.js';
import {hintChooserMixin} from './hintChooserMixin.js';
import MediatorGreeting from './MediatorGreeting.vue';
import {shouldUseFirstPartyMode} from '../platformDetection.js';

export default {
  name: 'Mediator',
  components: {MediatorGreeting},
  mixins: [hintChooserMixin],
  data() {
    return {
      defaultHintOption: null,
      firstPartyMode: true,
      rememberChoice: true,
      showGreeting: true,
      popupOpen: false
    };
  },
  computed: {
    greetingIconSize() {
      // combined greeting + hints screen; de-emphasize greeting icon size
      if(this.showGreeting && this.showHintChooser) {
        return 36;
      }
      return 48;
    },
    hasCustomFooter() {
      return !this.showGreeting || this.popupOpen ||
        (this.showGreeting && this.showHintChooser) ||
        (this.display === 'permissionRequest' && !this.firstPartyMode);
    },
    relyingOriginName() {
      if(!this.relyingOriginManifest) {
        return this.relyingDomain;
      }
      const {name, short_name} = this.relyingOriginManifest;
      return name || short_name || this.relyingDomain;
    }
  },
  async created() {
    this.loading = true;

    // FIXME: change this function to return the flow ID -- and don't cache
    // the value here, but in `platformDetection` ... always call this function
    // to get the current mode
    this.firstPartyMode = shouldUseFirstPartyMode();

    const {origin, host} = parseUrl({url: document.referrer});
    this.relyingOrigin = origin;
    this.relyingDomain = host;

    // FIXME: load polyfill in `index.js` instead; decouple it from vue
    // components
    await loadPolyfill({component: this, credentialRequestOrigin: origin});
  },
  methods: {
    async allow() {
      this.loading = true;
      const {defaultHintOption: hintOption} = this;
      if(!hintOption) {
        return this.deny();
      }
      const {credentialHandler, credentialHintKey, enabledTypes} = hintOption;
      const hint = {name: credentialHintKey, enabledTypes};
      await navigator.credentialMediator.ui.registerCredentialHandler(
        credentialHandler, hint);
      const resolvePermissionRequest = getResolvePermissionRequest();
      resolvePermissionRequest({state: 'granted'});
      this.reset();
      await navigator.credentialMediator.hide();
    },
    async deny() {
      this.loading = true;
      const resolvePermissionRequest = getResolvePermissionRequest();
      resolvePermissionRequest({state: 'denied'});
      this.reset();
      await navigator.credentialMediator.hide();
    },
    focusPopup() {
      if(this._popupDialog) {
        this._popupDialog.handle.focus();
      }
    },
    async nextWizardStep() {
      this.loading = true;
      try {
        if(this.firstPartyMode) {
          // handle permission request case
          if(this.display === 'permissionRequest') {
            const url = `${window.location.origin}/mediator/allow-wallet`;
            const {relyingOrigin, relyingOriginManifest} = this;

            // FIXME: fix broken abstraction by re-engineering helper functions
            const boundOpenWindow = openAllowWalletWindow.bind(this);
            const {status} = await boundOpenWindow({
              url,
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
            return;
          }

          const url = `${window.location.origin}/mediator/wallet-chooser`;
          const {
            credentialRequestOptions, credential,
            relyingOrigin, relyingOriginManifest
          } = this;

          // FIXME: fix broken abstraction by re-engineering helper functions
          const boundOpenWindow = openCredentialHintWindow.bind(this);
          const {choice} = await boundOpenWindow({
            url, credential, credentialRequestOptions,
            credentialRequestOrigin: relyingOrigin,
            credentialRequestOriginManifest: relyingOriginManifest
          });

          // if a choice was made... (vs. closing the window)
          if(choice) {
            this.showGreeting = false;
            this.selectHint({...choice, waitUntil: () => {}});
          }
        }
      } finally {
        this.loading = false;
      }
    },
    async prevWizardStep() {
      this.showGreeting = true;
      if(this.selectedHint) {
        await this.cancelSelection();
      }
    },
    useRememberedHint({showHintChooser = true} = {}) {
      // check to see if there is a reusable choice for the relying party
      const {hintOptions, relyingOrigin} = this;
      const hint = getSiteChoice({relyingOrigin, hintOptions});
      if(hint) {
        this.showGreeting = false;
        this.rememberChoice = true;
        this.selectHint({hint, waitUntil() {}});
        return true;
      }
      this.showHintChooser = showHintChooser;
      return false;
    },
    async selectHint(event) {
      this.selectedHint = event.hint;
      let _resolve;
      event.waitUntil(new Promise(r => _resolve = r));

      let {credentialHandler} = event.hint.hintOption;

      // auto-register handler if hint was JIT-created
      if(event.hint.jit) {
        await autoRegisterHint({event, credentialHandler});
      }

      // save choice for site
      if(!this.rememberChoice || this.firstPartyMode) {
        credentialHandler = null;
      }
      const {relyingOrigin} = this;
      setSiteChoice({relyingOrigin, credentialHandler});

      let canceled = false;
      let response;
      const deferredCredentialOperation = getDeferredCredentialOperation();
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
        this.showGreeting = true;
        if(!this.firstPartyMode) {
          this.showHintChooser = true;
        }
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
    async startCredentialFlow() {
      this.loading = true;

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

      // attempt to load web app manifest icon
      const manifest = await getWebAppManifest({host: this.relyingDomain});
      this.relyingOriginManifest = manifest;

      // load and show hints immediately in non-1p mode
      if(!this.firstPartyMode) {
        // load hints early if possible to avoid showing UI
        await this.loadHints();
        // this will cause a remembered hint to execute immediately without
        // showing the greeting dialog
        this.useRememberedHint();
      }

      // await showing mediator UI
      await showMediatorPromise;

      this.loading = false;
    },
    reset() {
      // reset the same fields found in the hintChooserMixin
      this.credentialRequestOptions = this.credential = null;
      this.display = null;
      this.hintOptions = [];
      this.loading = false;
      this.selectedHint = null;
      this.showHintChooser = false;

      // reset other fields
      this.rememberChoice = true;
      this.showGreeting = true;
      this.popupOpen = false;
      if(this._popupDialog) {
        this._popupDialog.close();
      }
      this._popupDialog = null;
    }
  }
};

</script>

<style>
</style>
