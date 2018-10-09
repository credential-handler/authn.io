<template>
  <div class="wrm-panel" style="height: 60px">
    <div
      class="wrm-flex-row wrm-header-hint"
      style="padding: 5px; margin: 1px 0">
      <i v-if="!hint.icon"
        class="fas fa-wallet wrm-flex-item"
        style="padding-left: 8px; font-size: 48px"></i>
      <img v-if="hint.icon" :src="hint.icon.fetchedImage"
        style="width: 48px; max-height: 48px" class="wrm-flex-item">
      <div
        style="margin-left: 10px; font-size: 14px"
        class="wrm-flex-item-grow wrm-ellipsis">
        You are using <strong>{{hint.name}}</strong> to
        <span v-if="operation === 'store'">store credentials</span>
        <span v-else>share credentials</span>
        <h6>
          <i class="fas fa-lock wrm-flex-item wrm-green"></i>
          <span class="wrm-green">https</span>://{{hint.origin.substr(8)}}
        </h6>
      </div>
      <wrm-header-close-button @click.native="cancel()" />
    </div>
  </div>
</template>
<script>
/*!
 * New BSD License (3-clause)
 * Copyright (c) 2017-2018, Digital Bazaar, Inc.
 * All rights reserved.
 */
'use strict';

export default {
  name: 'HandlerWindowHeader',
  props: {
    origin: {
      type: String,
      required: true
    },
    relyingDomain: {
      type: String,
      required: true
    },
    operation: {
      type: String,
      required: true
    },
    hint: {
      type: Object,
      required: true
    }
  },
  methods: {
    cancel() {
      this.$emit('cancel');
    }
  }
};
</script>
<style>
</style>
