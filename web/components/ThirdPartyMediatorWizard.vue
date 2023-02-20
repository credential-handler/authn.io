<template>
  <!-- blank screen while credential request is loading -->
  <div v-if="!requestType" />
  <wrm-wizard-dialog
    v-else
    :loading="loading"
    :first="true"
    :has-next="true"
    :blocked="loading"
    @cancel="cancel()"
    @next="openFirstPartyDialog()">
    <template slot="header">
      <MediatorHeader
        :title="headerTitle"
        :loading="headerLoading" />
    </template>
    <template slot="body">
      <!-- step 1 w/ 1p, integrated with 3p -->
      <mediator-greeting
        :icon-size="greetingIconSize"
        :credential-request-origin="credentialRequestOrigin"
        :credential-request-origin-manifest="credentialRequestOriginManifest"
        :request-type="requestType" />

      <!-- separator between greeting and any hints shown -->
      <div
        v-if="showHintChooser || selectedHint"
        class="wrm-modal-content-header" />

      <!-- integrated with 3p -->
      <HintChooser
        v-if="showHintChooser"
        :hints="hints"
        :loading="loading"
        :credential-request-origin="credentialRequestOrigin"
        :credential-request-origin-manifest="credentialRequestOriginManifest"
        :request-type="requestType"
        @cancel="cancel()"
        @confirm="selectHint"
        @remove-hint="removeHint"
        @select-hint="selectHint"
        @web-share="webShare()">
        <template slot="hint-list-footer">
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
      </HintChooser>

      <!-- shown while a hint has been selected w/ open handler window -->
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
      <!-- clear footer when shown with hint chooser or selected hint -->
      <div v-if="showHintChooser || selectedHint" />
      <div
        v-else-if="requestType === 'permissionRequest' && !popupOpen"
        class="wrm-button-bar"
        style="margin-top: 10px">
        <button
          type="button"
          class="wrm-button"
          :disabled="loading"
          @click="deny()">
          Block
        </button>
        <span style="margin-right: 5px" />
        <button
          type="button"
          class="wrm-button"
          :disabled="loading"
          @click="allow()">
          Allow
        </button>
      </div>
      <!-- FIXME: do not show this button on mobile; it has no effect -->
      <div
        v-else-if="!selectedHint && popupOpen"
        class="wrm-button-bar"
        style="margin: auto; margin-top: 1em">
        <button
          type="button"
          class="wrm-button wrm-primary"
          style="margin: auto"
          @click="focusPopup()">
          {{firstPartyDialogFocusText}}
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
import HandlerWindowHeader from './HandlerWindowHeader.vue';
import HintChooser from './HintChooser.vue';
import MediatorGreeting from './MediatorGreeting.vue';
import MediatorHeader from './MediatorHeader.vue';
import {ThirdPartyMediator} from '../mediator/ThirdPartyMediator.js';
import Vue from 'vue';

export default {
  name: 'ThirdPartyMediatorWizard',
  components: {HintChooser, MediatorGreeting, MediatorHeader},
  data() {
    return {
      // FIXME: audit whether all of these are needed
      credential: null,
      credentialRequestOptions: null,
      requestType: null,
      hints: [],
      loading: true,
      credentialRequestOrigin: null,
      credentialRequestOriginManifest: null,
      selectedHint: null,
      showHintChooser: false,
      // FIXME: alphabetize once needs are determined
      firstPartyMode: true,
      rememberChoice: true,
      popupOpen: false
    };
  },
  computed: {
    headerLoading() {
      return this.loading || !!this.selectedHint;
    },
    headerTitle() {
      const {selectedHint, showHintChooser, requestType} = this;
      if(selectedHint) {
        return 'Loading Wallet...';
      }
      if(showHintChooser) {
        return 'Choose a Wallet';
      }
      if(requestType === 'permissionRequest') {
        return 'Allow Wallet';
      }
      if(requestType === 'credentialRequest') {
        return 'Credentials Request';
      }
      return 'Store Credentials';
    },
    greetingIconSize() {
      // on hints screen, de-emphasize greeting icon size
      if(this.showHintChooser) {
        return 36;
      }
      return 48;
    },
    hasCustomFooter() {
      return !this.firstPartyMode || this.popupOpen;
    },
    firstPartyDialogFocusText() {
      if(this.requestType === 'permissionRequest') {
        return 'Show Permission Window';
      }
      return 'Show Wallet Chooser';
    }
  },
  async created() {
    try {
      // FIXME: move to MediatorPage?
      const mediator = new ThirdPartyMediator();
      this._mediator = mediator;

      // FIXME: create computed from `mediator.firstPartyMode`
      this.firstPartyMode = mediator.firstPartyMode;
      // FIXME: create computed from `mediator.credentialRequestOrigin`
      this.credentialRequestOrigin = mediator.credentialRequestOrigin;

      await mediator.initialize({
        show: ({requestType}) => {
          this.loading = true;
          this.requestType = requestType;
          this.showHintChooser = false;
          this.requestType = requestType;
          this.credential = mediator.credential;
          this.credentialRequestOptions = mediator.credentialRequestOptions;

          // if the web app manifest loads, use it
          mediator.credentialRequestOriginManifestPromise.then(manifest => {
            this.credentialRequestOriginManifest = manifest;
          });
        },
        hide: () => this.reset(),
        ready: () => {
          this.hints = mediator.hintManager.hints.slice();
          // FIXME: make `showHintChooser` a computed var in Vue 3
          if(!mediator.firstPartyMode &&
            this.requestType !== 'permissionRequest') {
            this.showHintChooser = true;
          }
          this.loading = false;
        },
        showHandlerWindow: ({webAppWindow}) =>
          _showHandlerWindow({webAppWindow, mediator})
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
    async cancel() {
      return this._mediator.cancel();
    },
    async deny() {
      this.loading = true;
      await this._mediator.denyCredentialHandler();
    },
    focusPopup() {
      this._mediator.focusFirstPartyDialog();
    },
    async openFirstPartyDialog() {
      this.loading = true;
      try {
        // FIXME: bikeshed this approach to handling 1p dialog state changes
        const opened = () => this.popupOpen = true;
        const closed = () => this.popupOpen = false;

        // handle permission request case
        if(this.requestType === 'permissionRequest') {
          await this._mediator
            .handlePermissionRequestWithFirstPartyMediator({opened, closed});
          return;
        }

        // handle all other cases
        const {choice} = await this._mediator
          .getHintChoiceWithFirstPartyMediator({opened, closed});
        // if a choice was made... (vs. closing the window)
        if(choice) {
          this.selectHint({...choice, waitUntil: () => {}});
        }
      } finally {
        this.loading = false;
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
        if(!this._mediator.firstPartyMode) {
          this.showHintChooser = true;
        }
      }
    },
    async removeHint(event) {
      const {hint} = event;
      const {_mediator: {hintManager}} = this;
      this.loading = true;
      this.hints = [];
      const promise = hintManager.removeHint({hint});
      event.waitUntil(promise.catch(() => {}));
      try {
        await promise;
      } finally {
        this.hints = hintManager.hints.slice();
        this.loading = false;
      }
    },
    reset() {
      this.credentialRequestOptions = this.credential = null;
      this.requestType = null;
      this.hints = [];
      this.loading = false;
      this.selectedHint = null;
      this.showHintChooser = false;

      // reset other fields
      this.rememberChoice = true;
      this.popupOpen = false;
    },
    async webShare() {
      return this._mediator.webShare();
    }
  }
};

function _showHandlerWindow({webAppWindow, mediator}) {
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
      hint: mediator.selectedHint
    },
    created() {
      this.$on('back', mediator.cancelSelection.bind(mediator));
      this.$on('cancel', mediator.cancel.bind(mediator));
    }
  });
  // clear iframe style that was set by web-request-rpc; set instead via CSS
  iframe.style.cssText = null;
  iframe.classList.add('wrm-handler-iframe');
}
</script>

<style>
</style>