<template>
  <div>
    <div
      class="wrm-separator wrm-modern"
      style="margin: 15px -15px 0px" />
    <!-- expander: the QR code is hidden until the user asks for it -->
    <div
      class="cross-device-toggle"
      role="button"
      tabindex="0"
      :aria-expanded="expanded"
      @click="toggle()"
      @keydown.enter.prevent="toggle()"
      @keydown.space.prevent="toggle()">
      <span>Don't see your wallet?</span>
      <i
        class="fas"
        :class="expanded ? 'fa-chevron-up' : 'fa-chevron-down'" />
    </div>
    <div
      v-if="expanded"
      style="text-align: center">
      <div class="wrm-dark-gray">
        Scan this code on a device with your wallet:
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
    const expanded = ref(false);
    const toggle = () => expanded.value = !expanded.value;

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
    return {close, expanded, qrDataUrl, toggle};
  }
};
</script>

<style>
</style>
