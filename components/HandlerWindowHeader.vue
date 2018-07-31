<template>
  <div class="wrm-panel">
    <div
      class="wrm-flex-row wrm-header-hint"
      style="padding: 5px; margin: 1px 0;">
      <i v-if="!hint.icon"
        class="fa fa-user-circle fa-3x wrm-flex-item"
        style="padding-left: 8px"></i>
      <img v-if="hint.icon" :src="hint.icon.fetchedImage"
        style="width: 40px; max-height: 40px" class="wrm-flex-item">
      <div style="margin-left: 10px;" class="wrm-flex-item-grow">
        You are using <strong>{{hint.name}}</strong> to
        <span v-if="operation === 'store'">store credentials</span>
        <span v-else>provide credentials</span>
        <h6>
          <i class="fa fa-lock wrm-flex-item wrm-green"></i>
          <span class="wrm-green">https</span>://{{hint.origin}}
        </h6>
      </div>
      <div class="wrm-flex-item wrm-header-close-button" @click="cancel()">
        <div>
          <svg>
            <path d="M7, 7, 19, 19" />
            <path d="M7, 19, 19, 7" />
          </svg>
        </div>
      </div>
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
