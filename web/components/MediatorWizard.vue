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
      <MediatorHeader
        :title="headerTitle"
        :loading="headerLoading" />
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
        <!-- FIXME: while `relyingOriginManifest` is still loading, do not
          allow to be clicked; perhaps `loading` handles this, check it -->
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
import {parseUrl} from '../helpers.js';
import {hintChooserMixin} from './hintChooserMixin.js';
import {ThirdPartyMediator} from '../ThirdPartyMediator.js';
import MediatorGreeting from './MediatorGreeting.vue';
import MediatorHeader from './MediatorHeader.vue';
import {shouldUseFirstPartyMode} from '../platformDetection.js';

export default {
  name: 'MediatorWizard',
  components: {MediatorGreeting, MediatorHeader},
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
    headerLoading() {
      return this.loading || !!this.selectedHint;
    },
    headerTitle() {
      const {selectedHint, showGreeting, showHintChooser, display} = this;
      if(selectedHint) {
        return 'Loading Wallet...';
      }
      if(showGreeting) {
        if(display === 'permissionRequest') {
          return 'Allow Wallet';
        }
        if(showHintChooser) {
          return 'Choose a Wallet';
        }
        if(display === 'credentialRequest') {
          return 'Credentials Request';
        }
        return 'Store Credentials';
      }
      return 'Choose a Wallet';
    },
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
    }
  },
  async created() {
    this.loading = true;

    try {
      // FIXME: use `mediator.firstPartyMode`
      this.firstPartyMode = shouldUseFirstPartyMode();
      // FIXME: use `mediator.relyingOrigin`
      const {origin} = parseUrl({url: document.referrer});
      this.relyingOrigin = origin;

      // FIXME: move to MediatorPage?
      const mediator = new ThirdPartyMediator();
      this._mediator = mediator;
      // FIXME: try/catch?
      await mediator.initialize({
        show: ({requestType, operationState}) => {
          // FIXME: is setting `loading=true` here necessary?
          this.loading = true;
          this.display = requestType;
          this.showHintChooser = false;
          this.showGreeting = true;
          this.requestType = requestType;
          if(requestType === 'credentialRequest') {
            this.credentialRequestOptions =
              operationState.input.credentialRequestOptions;
          } else if(requestType === 'credentialStore') {
            this.credential = operationState.input.credential;
          }

          // if the web app manifest loads, use it
          mediator.relyingOriginManifestPromise.then(manifest => {
            this.relyingOriginManifest = manifest;
          });
        },
        hide: () => {
          this.loading = false;
          this.reset();
        },
        ready: () => {
          this.hintOptions = mediator.hintOptions;
          if(!mediator.firstPartyMode &&
            this.requestType !== 'permissionRequest') {
            this.showHintChooser = true;
          }
          this.loading = false;
        }
      });
    } catch(e) {
      console.error('Error initializing mediator:', e);
    }
  },
  methods: {
    async allow() {
      this.loading = true;
      await this._mediator.allowCredentialHandler();
    },
    async deny() {
      this.loading = true;
      await this._mediator.denyCredentialHandler();
    },
    focusPopup() {
      this._mediator.focusFirstPartyDialog();
    },
    async nextWizardStep() {
      // FIXME: notably, this is only ever called on platforms that need to
      // use first party mode, so this can be simplified
      this.loading = true;
      try {
        // FIXME: conditional unnecessary, `next` should be gated so that it
        // can only be called in first party mode platforms anyway
        if(this.firstPartyMode) {
          // handle permission request case
          if(this.display === 'permissionRequest') {
            // FIXME: need to pass something to set `this.popupOpen`
            await this._mediator
              .handlePermissionRequestWithFirstPartyMediator();
            return;
          }

          // handle all other cases
          // FIXME: need to pass something to set `this.popupOpen`
          const {choice} = await this._mediator
            .getHintChoiceWithFirstPartyMediator();
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
    async selectHint(event) {
      const {hint} = event;
      this.selectedHint = hint;
      const {rememberChoice} = this;
      const promise = this._mediator.selectHint({hint, rememberChoice});
      event.waitUntil(promise.catch(() => {}));
      try {
        await promise;
      } finally {
        this.selectedHint = null;
        // FIXME: why set `rememberChoice` here?
        this.rememberChoice = true;
        this.showGreeting = true;
        if(!this._mediator.firstPartyMode) {
          this.showHintChooser = true;
        }
      }
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
    }
  }
};

</script>

<style>
</style>
