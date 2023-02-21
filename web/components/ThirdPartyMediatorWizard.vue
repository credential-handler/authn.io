<template>
  <!-- blank screen while credential request is loading -->
  <div v-if="!requestType" />
  <MediatorWizard
    v-else
    :credential-request-origin="credentialRequestOrigin"
    :credential-request-origin-manifest="credentialRequestOriginManifest"
    :first-party-dialog-open="firstPartyDialogOpen"
    :has-storage-access="hasStorageAccess"
    :hints="hints"
    :loading="loading"
    :request-type="requestType"
    :selected-hint="selectedHint"
    :show-hint-chooser="showHintChooser"
    @allow="allow()"
    @cancel="cancel()"
    @deny="deny()"
    @focus-first-party-dialog="focusFirstPartyDialog()"
    @open-first-party-dialog="openFirstPartyDialog()"
    @remove-hint="removeHint"
    @select-hint="selectHint"
    @web-share="webShare">
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
  </MediatorWizard>
</template>

<script>
/*!
 * New BSD License (3-clause)
 * Copyright (c) 2017-2023, Digital Bazaar, Inc.
 * All rights reserved.
 */
import HandlerWindowHeader from './HandlerWindowHeader.vue';
import MediatorWizard from './MediatorWizard.vue';
import {ThirdPartyMediator} from '../mediator/ThirdPartyMediator.js';
import Vue from 'vue';

export default {
  name: 'ThirdPartyMediatorWizard',
  components: {MediatorWizard},
  data() {
    return {
      credentialRequestOrigin: null,
      credentialRequestOriginManifest: null,
      firstPartyDialogOpen: false,
      hasStorageAccess: false,
      hints: [],
      loading: true,
      rememberChoice: true,
      requestType: null,
      selectedHint: null,
      showHintChooser: false
    };
  },
  async created() {
    try {
      // FIXME: move to MediatorPage?
      const mediator = new ThirdPartyMediator();
      this._mediator = mediator;

      // FIXME: create computed from `mediator.hasStorageAccess`
      this.hasStorageAccess = mediator.hasStorageAccess;
      // FIXME: create computed from `mediator.credentialRequestOrigin`
      this.credentialRequestOrigin = mediator.credentialRequestOrigin;

      await mediator.initialize({
        show: ({requestType}) => {
          this.loading = true;
          this.requestType = requestType;
          this.showHintChooser = false;

          // if the web app manifest loads, use it
          mediator.credentialRequestOriginManifestPromise.then(manifest => {
            this.credentialRequestOriginManifest = manifest;
          });
        },
        hide: () => this.reset(),
        ready: () => {
          this.hints = mediator.hintManager.hints.slice();
          // FIXME: make `showHintChooser` a computed var in Vue 3
          if(mediator.hasStorageAccess &&
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
      this.loading = true;
      return this._mediator.cancel();
    },
    async deny() {
      this.loading = true;
      await this._mediator.denyCredentialHandler();
    },
    focusFirstPartyDialog() {
      this._mediator.focusFirstPartyDialog();
    },
    async openFirstPartyDialog() {
      this.loading = true;
      try {
        // FIXME: bikeshed this approach to handling 1p dialog state changes
        const opened = () => this.firstPartyDialogOpen = true;
        const closed = () => this.firstPartyDialogOpen = false;

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
        // show hint selection when mediator has storage access
        if(this._mediator.hasStorageAccess) {
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
      this.hints = [];
      this.loading = false;
      this.firstPartyDialogOpen = false;
      this.rememberChoice = true;
      this.requestType = null;
      this.selectedHint = null;
      this.showHintChooser = false;
    },
    async webShare() {
      await this._mediator.webShare();
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