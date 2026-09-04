<template>
  <WrmHintChooser
    class="hint-chooser"
    style="user-select: none"
    :hints="hints"
    :cancel-remove-hint-timeout="5000"
    hint-removal-text="Hiding..."
    default-hint-icon="fas fa-wallet"
    enable-remove-hint
    @cancel="cancel()"
    @confirm="selectHint"
    @remove-hint="removeHint">
    <template #message>
      <HintChooserMessage
        :loading="loading"
        :credential-request-origin-name="credentialRequestOriginName"
        :request-type="requestType"
        :show-warning="hints.length === 0"
        :has-cross-device-option="!!interactionUrl"
        @close="cancel()" />
    </template>
    <template #hint-list-footer>
      <slot name="hint-list-footer" />
      <!-- with no wallets to choose from, the QR code is the primary
        option: show it immediately instead of behind the expander -->
      <CrossDeviceOptions
        v-if="interactionUrl"
        :collapsible="hints.length > 0"
        :interaction-url="interactionUrl"
        :loading="loading"
        :recommend-app="hints.length === 0"
        :wallet-app-url="walletAppUrl"
        :wallet-web-url="walletWebUrl"
        @activate="crossDevice()"
        @close="crossDevice()" />
      <!-- include separator before web share button if there are no hints -->
      <div
        v-if="canWebShare && hints.length === 0"
        class="wrm-separator wrm-modern"
        style="margin: 15px -15px 0px" />
      <div
        v-if="canWebShare"
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
  </WrmHintChooser>
</template>

<script>
/*!
 * New BSD License (3-clause)
 * Copyright (c) 2017-2026, Digital Bazaar, Inc.
 * All rights reserved.
 */
import CrossDeviceOptions from './CrossDeviceOptions.vue';
import HintChooserMessage from './HintChooserMessage.vue';
import {WrmHintChooser} from 'vue-web-request-mediator';

export default {
  name: 'HintChooser',
  components: {CrossDeviceOptions, HintChooserMessage, WrmHintChooser},
  props: {
    canWebShare: {
      type: Boolean,
      required: false,
      default: false
    },
    credentialRequestOriginName: {
      type: String,
      required: true
    },
    hints: {
      type: Array,
      required: false,
      default: () => []
    },
    interactionUrl: {
      type: String,
      required: false,
      default: ''
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
    walletAppUrl: {
      type: String,
      required: false,
      default: ''
    },
    walletWebUrl: {
      type: String,
      required: false,
      default: ''
    }
  },
  emits: ['cancel', 'cross-device', 'select-hint', 'remove-hint', 'web-share'],
  setup(props, {emit}) {
    const cancel = event => emit('cancel', event);
    const crossDevice = event => emit('cross-device', event);
    const selectHint = event => emit('select-hint', event);
    const removeHint = event => emit('remove-hint', event);
    const webShare = () => emit('web-share');
    return {cancel, crossDevice, removeHint, selectHint, webShare};
  }
};
</script>

<style>
</style>
