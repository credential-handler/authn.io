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
      <!-- step 1 w/ 1p, integrated with 3p -->
      <mediator-greeting
        v-if="showGreeting"
        :icon-size="greetingIconSize"
        :credential-request-origin="credentialRequestOrigin"
        :credential-request-origin-manifest="credentialRequestOriginManifest"
        :request-type="display" />

      <!-- separator between greeting and hint chooser when both shown -->
      <div
        v-if="showGreeting && showHintChooser"
        class="wrm-modal-content-header" />

      <!-- integrated with 3p -->
      <HintChooser
        v-if="showHintChooser"
        :hints="hints"
        :loading="loading"
        :credential-request-origin="credentialRequestOrigin"
        :credential-request-origin-manifest="credentialRequestOriginManifest"
        :request-type="display"
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
        <!-- FIXME: while `credentialRequestOriginManifest` is still loading,
          do not allow to be clicked; perhaps `loading` handles this,
          check it -->
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
      display: null,
      hints: [],
      hintRemovalText: 'Hiding...',
      loading: true,
      credentialRequestOrigin: null,
      credentialRequestOriginManifest: null,
      selectedHint: null,
      showHintChooser: false,
      // FIXME: alphabetize once needs are determined
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
      // FIXME: this conditional can be simplified
      return !this.showGreeting || this.popupOpen ||
        (this.showGreeting && this.showHintChooser) ||
        (this.display === 'permissionRequest' && !this.firstPartyMode);
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
          this.display = requestType;
          this.showHintChooser = false;
          this.showGreeting = true;
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
    async nextWizardStep() {
      // FIXME: notably, this is only ever called on platforms that need to
      // use first party mode, so this can be simplified
      this.loading = true;
      try {
        // FIXME: conditional unnecessary, `next` should be gated so that it
        // can only be called in first party mode platforms anyway
        if(this.firstPartyMode) {
          // FIXME: bikeshed this approach to handling 1p dialog state changes
          const opened = () => this.popupOpen = true;
          const closed = () => this.popupOpen = false;

          // handle permission request case
          if(this.display === 'permissionRequest') {
            await this._mediator
              .handlePermissionRequestWithFirstPartyMediator({opened, closed});
            return;
          }

          // handle all other cases
          const {choice} = await this._mediator
            .getHintChoiceWithFirstPartyMediator({opened, closed});
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
        await this._mediator.cancelSelection();
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
      this.display = null;
      this.hints = [];
      this.loading = false;
      this.selectedHint = null;
      this.showHintChooser = false;

      // reset other fields
      this.rememberChoice = true;
      this.showGreeting = true;
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
