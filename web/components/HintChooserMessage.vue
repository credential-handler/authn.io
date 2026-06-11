<template>
  <div style="padding-top: 10px">
    <div v-if="loading">
      Loading options... <i class="fas fa-cog fa-spin" />
    </div>
    <div
      v-else-if="showWarning && hasCrossDeviceOption"
      style="font-size: 14px">
      <p v-if="requestType === 'credentialRequest'">
        No wallet with the credentials requested by
        <strong>{{credentialRequestOriginName}}</strong> is registered
        in this browser. You can scan the QR code below to use a wallet
        on another device, or visit your wallet website to register.
      </p>
      <p v-else>
        No wallet is registered in this browser to store credentials.
        You can scan the QR code below to use a wallet on another
        device, or visit your wallet website to register.
      </p>
    </div>
    <div
      v-else-if="showWarning"
      style="font-size: 14px">
      <div style="font-weight: bold">
        Warning
      </div>
      <div v-if="requestType === 'credentialRequest'">
        <p>
          You don't have the credentials requested by this website.
          Please check <strong>{{credentialRequestOriginName}}</strong> to find
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
          @click="close()">
          Close
        </button>
      </div>
    </div>
  </div>
</template>

<script>
/*!
 * New BSD License (3-clause)
 * Copyright (c) 2017-2026, Digital Bazaar, Inc.
 * All rights reserved.
 */
export default {
  name: 'HintChooserMessage',
  props: {
    loading: {
      type: Boolean,
      required: false,
      default: false
    },
    credentialRequestOriginName: {
      type: String,
      required: true
    },
    requestType: {
      type: String,
      required: true
    },
    showWarning: {
      type: Boolean,
      required: true
    },
    hasCrossDeviceOption: {
      type: Boolean,
      required: false,
      default: false
    }
  },
  emits: ['close'],
  setup(props, {emit}) {
    const close = () => emit('close');
    return {close};
  }
};
</script>

<style>
</style>
