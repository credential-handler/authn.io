<template>
  <div style="padding-top: 10px">
    <div v-if="loading">
      Loading options... <i class="fas fa-cog fa-spin" />
    </div>
    <div
      v-else-if="showWarning && hasCrossDeviceOption"
      style="font-size: 14px">
      <!-- Kept short, since this sits directly above the options that
        answer it. `showWarning` is `hints.length === 0`, and hints are
        filtered to registrations that *match* the request, so this must
        not claim no wallet is registered: the common case is a wallet
        that does not hold the requested credential. -->
      <p style="margin: 0">
        {{noWalletMessage}}
      </p>
      <!-- A first-timer has no wallet to open, so the link rows below
        assume something they may not have. Keep the route to getting
        one. -->
      <p
        v-if="requestType === 'credentialRequest'"
        style="margin: 0.5em 0 0">
        Check <strong>{{credentialRequestOriginName}}</strong> to find out
        how to obtain it, or visit your wallet website to register.
      </p>
      <p
        v-else
        style="margin: 0.5em 0 0">
        Or visit your wallet website to register it with this browser.
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
import {computed} from 'vue';

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
    /* `showWarning` is `hints.length === 0`, and `HintManager.reload()`
    filters hints through `matchCredentialRequest()`. So an empty list means
    "nothing registered here holds what was asked for", not "no wallet is
    registered" -- claiming the latter is wrong exactly when the user has a
    wallet that lacks the credential.

    It states the situation and nothing more: `CrossDeviceOptions` owns the
    "Don't see your wallet?" heading over the options that answer it, so a
    closing clause here would render a second heading above the first. */
    const noWalletMessage = computed(() =>
      props.requestType === 'credentialRequest' ?
        'No wallet registered in this browser has the requested credential.' :
        'No wallet is registered in this browser to store credentials.');
    const close = () => emit('close');
    return {close, noWalletMessage};
  }
};
</script>

<style>
</style>
