<template>
  <wrm-wizard-dialog
    :loading="loading"
    :first="true"
    :has-next="true"
    :blocked="loading"
    @cancel="cancel()"
    @next="next()">
    <template slot="header">
      <MediatorHeader
        :title="headerTitle"
        :loading="headerLoading" />
    </template>
    <template slot="body">
      <mediator-greeting
        :icon-size="greetingIconSize"
        :credential-request-origin="credentialRequestOrigin"
        :credential-request-origin-manifest="credentialRequestOriginManifest"
        :request-type="requestType" />

      <!-- separator between greeting and any hints shown -->
      <div
        v-if="showHintChooser || selectedHint"
        class="wrm-modal-content-header" />

      <HintChooser
        v-if="showHintChooser"
        :can-web-share="canWebShare"
        :credential-request-origin-name="credentialRequestOriginName"
        :hints="hints"
        :loading="loading"
        :request-type="requestType"
        @cancel="cancel()"
        @confirm="selectHint"
        @remove-hint="removeHint"
        @select-hint="selectHint"
        @web-share="webShare()">
        <template slot="hint-list-footer">
          <slot name="hint-list-footer" />
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
          v-if="firstPartyDialogOpen"
          class="wrm-button-bar"
          style="margin: auto; margin-top: 1em">
          <button
            type="button"
            class="wrm-button wrm-primary"
            style="margin: auto"
            @click="focusFirstPartyDialog()">
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
        v-else-if="requestType === 'permissionRequest' && !firstPartyDialogOpen"
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
        v-else-if="!selectedHint && firstPartyDialogOpen"
        class="wrm-button-bar"
        style="margin: auto; margin-top: 1em">
        <button
          type="button"
          class="wrm-button wrm-primary"
          style="margin: auto"
          @click="focusFirstPartyDialog()">
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
import {getOriginName} from '../mediator/helpers.js';
import HintChooser from './HintChooser.vue';
import MediatorGreeting from './MediatorGreeting.vue';
import MediatorHeader from './MediatorHeader.vue';

export default {
  name: 'MediatorWizard',
  components: {HintChooser, MediatorGreeting, MediatorHeader},
  props: {
    canWebShare: {
      type: Boolean,
      required: false,
      default: false
    },
    credentialRequestOrigin: {
      type: String,
      required: false,
      default: ''
    },
    credentialRequestOriginManifest: {
      type: Object,
      required: false,
      default: () => null
    },
    firstPartyDialogOpen: {
      type: Boolean,
      required: false,
      default: false
    },
    hasStorageAccess: {
      type: Boolean,
      required: false,
      default: false
    },
    hints: {
      type: Array,
      required: false,
      default: () => []
    },
    loading: {
      type: Boolean,
      required: true
    },
    requestType: {
      type: String,
      required: false,
      default: ''
    },
    selectedHint: {
      type: Object,
      required: false,
      default: () => null
    },
    showHintChooser: {
      type: Boolean,
      required: false,
      default: false
    }
  },
  computed: {
    credentialRequestOriginName() {
      const {
        credentialRequestOrigin: origin,
        credentialRequestOriginManifest: manifest
      } = this;
      if(!origin) {
        return '';
      }
      return getOriginName({origin, manifest});
    },
    firstPartyDialogFocusText() {
      if(this.requestType === 'permissionRequest') {
        return 'Show Permission Window';
      }
      return 'Show Wallet Chooser';
    },
    greetingIconSize() {
      // on hints screen, de-emphasize greeting icon size
      if(this.showHintChooser) {
        return 36;
      }
      return 48;
    },
    hasCustomFooter() {
      /* Note: The wizard default footer shows cancel/next buttons. But if
      mediator has storage access, all wizard steps are integrated and a
      custom footer will provide different buttons. If the first party dialog
      is open to access storage, then the footer is also replaced, this time
      with a button to focus that dialog if it does not have focus. */
      return this.hasStorageAccess || this.firstPartyDialogOpen;
    },
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
    }
  },
  methods: {
    allow() {
      this.$emit('allow');
    },
    deny() {
      this.$emit('deny');
    },
    cancel() {
      this.$emit('cancel');
    },
    focusFirstPartyDialog() {
      this.$emit('focus-first-party-dialog');
    },
    next() {
      this.$emit('open-first-party-dialog');
    },
    removeHint(event) {
      this.$emit('remove-hint', event);
    },
    selectHint(event) {
      this.$emit('select-hint', event);
    },
    webShare() {
      this.$emit('web-share');
    }
  }
};
</script>

<style>
</style>
