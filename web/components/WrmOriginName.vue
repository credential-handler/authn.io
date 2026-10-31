<template>
  <div>
    <slot name="task" />
    <div>
      <strong>{{name}}</strong>
    </div>
  </div>
</template>

<script>
/*!
 * New BSD License (3-clause)
 * Copyright (c) 2017-2026 Digital Bazaar, Inc.
 */
import {computed, toRef} from 'vue';

export default {
  name: 'WrmOriginName',
  props: {
    origin: {
      type: String,
      required: true
    },
    manifest: {
      type: Object,
      required: false,
      default: null
    }
  },
  setup(props) {
    const origin = toRef(props, 'origin');
    const manifest = toRef(props, 'manifest');

    const domain = computed(() => {
      // origin should always start with `https://`
      if(origin.value.startsWith('https://')) {
        return origin.value.substr(8);
      }
      return null;
    });
    const name = computed(() => {
      if(!manifest.value) {
        return domain.value || origin.value;
      }
      const {name, short_name} = manifest.value;
      return name || short_name || domain.value || origin.value;
    });

    return {name};
  }
};
</script>

<style>
</style>
