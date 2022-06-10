<template>
  <div>
    <div v-if="display === 'permissionRequest'">
      <wrm-permission-dialog
        v-if="showPermissionDialog"
        :origin="relyingDomain"
        :permissions="permissions"
        @deny="deny()"
        @allow="allow()" />
      <!-- FIXME: handle 1p window case -->
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
              <i
                v-if="loading"
                class="fas fa-cog fa-spin" />
            </div>
            <div v-else>
              Store Credentials
              <i
                v-if="loading"
                class="fas fa-cog fa-spin" />
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

        <!-- step 2 iframe -->
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
            <div
              class="wrm-button-bar"
              style="margin: auto; padding-top: 2em;">
              <button
                type="button"
                class="wrm-button wrm-primary"
                style="margin: auto"
                :disabled="loading"
                @click="webShare()">
                Share with Native App
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
        v-if="!showGreeting || popupOpen"
        slot="footer">
        <div
          v-if="showGreeting && popupOpen"
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
        <!-- clear footer after first step -->
        <div />
      </template>
    </wrm-wizard-dialog>
  </div>
</template>

<script>
/*!
 * New BSD License (3-clause)
 * Copyright (c) 2017-2022, Digital Bazaar, Inc.
 * All rights reserved.
 */
import {getSiteChoice, hasSiteChoice, setSiteChoice} from './siteChoice.js';
import {openCredentialHintWindow, autoRegisterHint} from './helpers.js';
import {hasStorageAccess, requestStorageAccess} from 'web-request-mediator';
import MediatorGreeting from './MediatorGreeting.vue';
import {shouldUseFirstPartyMode} from './platformDetection.js';
import {hintChooserMixin} from './hintChooserMixin.js';
import {
  getResolvePermissionRequest, getDeferredCredentialOperation, loadPolyfill
} from './mediatorPolyfill.js';

export default {
  name: 'Mediator',
  components: {MediatorGreeting},
  mixins: [hintChooserMixin],
  data() {
    return {
      firstPartyMode: true,
      hasStorageAccess: false,
      permissions: [{
        name: 'Manage credentials',
        icon: 'fas fa-id-card'
      }],
      rememberChoice: true,
      showGreeting: false,
      showPermissionDialog: false,
      popupOpen: false
    };
  },
  async created() {
    // TODO: is this the appropriate place to run this?
    await loadPolyfill(this);

    // FIXME: change this function to return the flow ID -- and don't cache
    // the value here, but in `platformDetection` ... always call this function
    // to get the current mode
    this.firstPartyMode = shouldUseFirstPartyMode();
  },
  methods: {
    async allow() {
      this.hasStorageAccess = await requestStorageAccess();
      if(this.hasStorageAccess) {
        const resolvePermissionRequest = getResolvePermissionRequest();
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
      const resolvePermissionRequest = getResolvePermissionRequest();
      resolvePermissionRequest('denied');
      this.reset();
      await navigator.credentialMediator.hide();
    },
    async cancelSelection() {
      console.log('Mediator.vue cancel selection');
      this.hideWizard = false;
      await navigator.credentialMediator.ui.cancelSelectCredentialHint();
    },
    async cancel() {
      console.log('Mediator.vue cancel');
      if(this.selectedHint) {
        await this.cancelSelection();
      }
      this.reset();
      const deferredCredentialOperation = getDeferredCredentialOperation();
      deferredCredentialOperation.resolve(null);
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
          const url = `${window.location.origin}/hint-chooser`;
          const {credentialRequestOptions, credential, relyingOrigin} = this;

          // FIXME: fix broken abstraction by re-engineering helper functions
          const boundOpenWindow = openCredentialHintWindow.bind(this);
          const {choice} = await boundOpenWindow({
            url, credential, credentialRequestOptions,
            credentialRequestOrigin: relyingOrigin
          });

          // if a choice was made... (vs. closing the window)
          if(choice) {
            this.showGreeting = false;
            this.selectHint({...choice, waitUntil: () => {}});
          }

          // early return to prevent going into non-first party mode
          return;
        }

        const mustLoadHints = !this.hasStorageAccess;
        // always call `requestStorageAccess` to refresh mediator's
        // user interaction timestamp
        this.hasStorageAccess = await requestStorageAccess();
        if(this.hasStorageAccess && !this.firstPartyMode) {
          if(mustLoadHints) {
            await this.loadHints();
          }
          this.useRememberedHint();
        }

        this.showGreeting = false;
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
    useRememberedHint({hideWizard = false, showHintChooser = true} = {}) {
      // remembered hint not allowed in 1P Mode
      if(this.firstPartyMode) {
        return;
      }
      // check to see if there is a reusable choice for the relying party
      const {hintOptions, relyingOrigin} = this;
      const hint = getSiteChoice({relyingOrigin, hintOptions});
      if(hint) {
        this.showGreeting = false;
        this.hideWizard = hideWizard;
        this.rememberChoice = true;
        this.selectHint({hint, waitUntil() {}});
      } else {
        this.showHintChooser = showHintChooser;
      }
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
      if(!this.rememberChoice) {
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
        if(this.firstPartyMode) {
          this.showGreeting = true;
        } else {
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
    async startFlow() {
      this.loading = true;

      // delay showing mediator UI if the site has a potential saved choice as
      // there may be no need to show it at all
      this.hasStorageAccess = await hasStorageAccess();
      const {relyingOrigin} = this;
      const delayShowMediator = this.hasStorageAccess &&
        hasSiteChoice({relyingOrigin});
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

      if(this.hasStorageAccess && !this.firstPartyMode) {
        // load hints early if possible to avoid showing UI
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

      // await showing mediator UI
      await showMediatorPromise;

      this.loading = false;
    },
    reset() {
      // reset the same fields found in the hintChooserMixin
      this.credentialRequestOptions = this.credential = null;
      this.display = null;
      this.hideWizard = false;
      this.hintOptions = [];
      this.loading = false;
      this.selectedHint = null;
      this.showHintChooser = false;

      // reset other fields
      this.hasStorageAccess = false;
      this.rememberChoice = true;
      this.showGreeting = false;
      this.showPermissionDialog = false;
      this.popupOpen = false;
    }
  }
};

</script>

<style>
</style>
