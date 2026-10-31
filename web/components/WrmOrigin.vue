<template>
  <div
    class="wrm-flex-row"
    style="justify-content: flex-start; font-weight: bold">
    <i
      class="fas fa-lock wrm-flex-item wrm-green"
      style="padding-right: 6px" />
    <span v-if="domain">
      <span class="wrm-dark-gray">{{domain}}</span>
    </span>
    <span v-else>
      <span class="wrm-dark-gray">{{origin}}</span>
    </span>
  </div>
</template>

<script>
/*!
 * New BSD License (3-clause)
 * Copyright (c) 2017-2026 Digital Bazaar, Inc.
 */
import {computed, toRef} from 'vue';

export default {
  name: 'WrmOrigin',
  props: {
    origin: {
      type: String,
      required: true
    }
  },
  setup(props) {
    const origin = toRef(props, 'origin');
    const domain = computed(() => {
      // origin should always start with `https://`
      if(origin.value.startsWith('https://')) {
        return origin.value.substr(8);
      }
      return null;
    });
    return {domain};
  }
};
</script>

<style>
</style>
