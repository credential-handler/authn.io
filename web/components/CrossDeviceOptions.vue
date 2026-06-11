<template>
  <div>
    <div
      class="wrm-separator wrm-modern"
      style="margin: 15px -15px 0px" />
    <div style="padding-top: 1em; text-align: center">
      <div class="wrm-dark-gray">
        Use a wallet on another device:
      </div>
      <img
        v-if="qrDataUrl"
        :src="qrDataUrl"
        alt="QR code for using a wallet on another device"
        style="width: 156px; height: 156px; margin: 0.5em auto">
      <div
        class="wrm-dark-gray"
        style="font-size: 14px">
        Already scanned? Click close to return to the website.
      </div>
      <div
        class="wrm-button-bar"
        style="margin: auto; padding-top: 0.5em">
        <button
          type="button"
          class="wrm-button"
          style="margin: auto"
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
 * Copyright (c) 2026, Digital Bazaar, Inc.
 * All rights reserved.
 */
import {ref, watchEffect} from 'vue';
import QRCode from 'qrcode';

export default {
  name: 'CrossDeviceOptions',
  props: {
    interactionUrl: {
      type: String,
      required: true
    },
    loading: {
      type: Boolean,
      required: false,
      default: false
    }
  },
  emits: ['close'],
  setup(props, {emit}) {
    const qrDataUrl = ref('');
    watchEffect(async () => {
      try {
        qrDataUrl.value = await QRCode.toDataURL(props.interactionUrl, {
          errorCorrectionLevel: 'M',
          margin: 2,
          scale: 4
        });
      } catch(e) {
        // fail soft: omit the QR image, never block the chooser
        console.error('Could not generate QR code:', e);
        qrDataUrl.value = '';
      }
    });
    const close = () => emit('close');
    return {close, qrDataUrl};
  }
};
</script>

<style>
</style>
