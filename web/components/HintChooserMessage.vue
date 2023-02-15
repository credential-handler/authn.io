<template>
  <div style="padding-top: 10px">
    <div v-if="loading">
      Loading options... <i class="fas fa-cog fa-spin" />
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
          Please check <strong>{{relyingOriginName}}</strong> to find
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
 * Copyright (c) 2017-2023, Digital Bazaar, Inc.
 * All rights reserved.
 */
import {getOriginName} from '../helpers.js';

export default {
  name: 'HintChooserMessage',
  props: {
    loading: {
      type: Boolean,
      required: false,
      default: false
    },
    relyingOrigin: {
      type: String,
      required: true
    },
    relyingOriginManifest: {
      type: Object,
      required: false,
      default: () => null
    },
    requestType: {
      type: String,
      required: true
    },
    showWarning: {
      type: Boolean,
      required: true
    }
  },
  computed: {
    relyingOriginName() {
      const {relyingOriginManifest: manifest, relyingOrigin: origin} = this;
      return getOriginName({origin, manifest});
    }
  },
  methods: {
    close() {
      console.log('closing');
      this.$emit('close');
    }
  }
};
</script>

<style>
</style>
