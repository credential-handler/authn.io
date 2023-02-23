<template>
  <!-- blank screen while credential request origin loads -->
  <div v-if="!credentialRequestOrigin" />
  <WrmWizardDialog
    v-else
    :class="isFirstParty ? 'wrm-modal-1p' : ''"
    :loading="loading"
    :first="true"
    :has-next="true"
    :blocked="loading"
    @cancel="cancel()"
    @next="next()">
    <template #header>
      <MediatorHeader
        :title="headerTitle"
        :loading="headerLoading" />
    </template>
    <template #body>
      <MediatorGreeting
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
        @remove-hint="removeHint"
        @select-hint="selectHint"
        @web-share="webShare()">
        <template #hint-list-footer>
          <slot name="hint-list-footer" />
        </template>
      </HintChooser>

      <!-- shown while a hint has been selected w/ open handler window -->
      <div
        v-else-if="selectedHint"
        style="padding-top: 15px">
        <WrmHint
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
      #footer>
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
  </WrmWizardDialog>
</template>

<script>
/*!
 * New BSD License (3-clause)
 * Copyright (c) 2017-2023, Digital Bazaar, Inc.
 * All rights reserved.
 */
import {computed, toRef} from 'vue';
import {WrmHint, WrmWizardDialog} from 'vue-web-request-mediator';
import {getOriginName} from '../mediator/helpers.js';
import HintChooser from './HintChooser.vue';
import MediatorGreeting from './MediatorGreeting.vue';
import MediatorHeader from './MediatorHeader.vue';

export default {
  name: 'MediatorWizard',
  components: {
    HintChooser, MediatorGreeting, MediatorHeader, WrmHint, WrmWizardDialog
  },
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
    isFirstParty: {
      type: Boolean,
      required: false,
      default: false
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
  emits: [
    'allow', 'cancel', 'deny',
    'focus-first-party-dialog', 'open-first-party-dialog',
    'remove-hint', 'select-hint', 'web-share'
  ],
  setup(props, {emit}) {
    const credentialRequestOrigin = toRef(props, 'credentialRequestOrigin');
    const credentialRequestOriginManifest = toRef(
      props, 'credentialRequestOriginManifest');
    const firstPartyDialogOpen = toRef(props, 'firstPartyDialogOpen');
    const hasStorageAccess = toRef(props, 'hasStorageAccess');
    const loading = toRef(props, 'loading');
    const requestType = toRef(props, 'requestType');
    const selectedHint = toRef(props, 'selectedHint');
    const showHintChooser = toRef(props, 'showHintChooser');

    const credentialRequestOriginName = computed(() => {
      if(!credentialRequestOrigin.value) {
        return '';
      }
      return getOriginName({
        origin: credentialRequestOrigin.value,
        manifest: credentialRequestOriginManifest.value
      });
    });
    const firstPartyDialogFocusText = computed(() => {
      if(requestType.value === 'permissionRequest') {
        return 'Show Permission Window';
      }
      return 'Show Wallet Chooser';
    });
    const greetingIconSize = computed(() => {
      // on hints screen, de-emphasize greeting icon size
      if(showHintChooser.value) {
        return 36;
      }
      return 48;
    });
    const hasCustomFooter = computed(() => {
      /* Note: The wizard default footer shows cancel/next buttons. But if
      mediator has storage access, all wizard steps are integrated and a
      custom footer will provide different buttons. If the first party dialog
      is open to access storage, then the footer is also replaced, this time
      with a button to focus that dialog if it does not have focus. */
      return hasStorageAccess.value || firstPartyDialogOpen.value;
    });
    const headerLoading = computed(() => {
      return loading.value || !!selectedHint.value;
    });
    const headerTitle = computed(() => {
      if(selectedHint.value) {
        return 'Loading Wallet...';
      }
      if(showHintChooser.value) {
        return 'Choose a Wallet';
      }
      if(requestType.value === 'permissionRequest') {
        return 'Allow Wallet';
      }
      if(requestType.value === 'credentialRequest') {
        return 'Credentials Request';
      }
      return 'Store Credentials';
    });

    const allow = () => emit('allow');
    const cancel = () => emit('cancel');
    const deny = () => emit('deny');
    const focusFirstPartyDialog = () => emit('focus-first-party-dialog');
    const next = () => emit('open-first-party-dialog');
    const removeHint = event => emit('remove-hint', event);
    const selectHint = event => emit('select-hint', event);
    const webShare = () => emit('web-share');
    return {
      // data
      credentialRequestOriginName, firstPartyDialogFocusText,
      greetingIconSize, hasCustomFooter, headerLoading, headerTitle,
      // methods
      allow, cancel, deny, focusFirstPartyDialog, next,
      removeHint, selectHint, webShare
    };
  }
};
</script>

<style>
</style>
