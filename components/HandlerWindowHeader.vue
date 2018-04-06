<template>
  <div class="wrm-panel">
    Using <strong>{{origin}}</strong> to
    <span v-if="operation === 'store'">store</span>
    <span v-else>provide</span> credentials
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
    }
  }
};
</script>
<style>
</style>
