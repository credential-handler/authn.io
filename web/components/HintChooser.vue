<template>
  <wrm-hint-chooser
    style="user-select: none"
    :hints="hints"
    :cancel-remove-hint-timeout="5000"
    hint-removal-text="Hiding..."
    default-hint-icon="fas fa-wallet"
    enable-remove-hint
    @cancel="cancel()"
    @confirm="selectHint"
    @remove-hint="removeHint">
    <template slot="message">
      <HintChooserMessage
        :loading="loading"
        :credential-request-origin="credentialRequestOrigin"
        :credential-request-origin-manifest="
          credentialRequestOriginManifest"
        :request-type="requestType"
        :show-warning="hints.length === 0"
        @close="cancel()" />
    </template>
    <template
      v-if="hints.length > 0"
      slot="hint-list-footer">
      <div
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
  </wrm-hint-chooser>
</template>

<script>
/*!
 * New BSD License (3-clause)
 * Copyright (c) 2017-2023, Digital Bazaar, Inc.
 * All rights reserved.
 */
import HintChooserMessage from './HintChooserMessage.vue';

export default {
  name: 'HintChooser',
  components: {HintChooserMessage},
  props: {
    hints: {
      type: Array,
      required: false,
      default: () => []
    },
    loading: {
      type: Boolean,
      required: true
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
    requestType: {
      type: String,
      required: false,
      default: ''
    }
  },
  methods: {
    cancel(event) {
      this.$emit('cancel', event);
    },
    selectHint(event) {
      this.$emit('select-hint', event);
    },
    removeHint(event) {
      this.$emit('remove-hint', event);
    },
    webShare() {
      this.$emit('web-share');
    }
  }
};
</script>

<style>
</style>
