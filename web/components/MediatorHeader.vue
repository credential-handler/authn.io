<template>
  <div style="font-size: 18px; font-weight: bold; user-select: none">
    <div style="margin-left: -5px">
      {{title}}
      <i
        v-if="loading"
        class="fas fa-cog fa-spin" />
    </div>
  </div>
</template>

<script>
/*!
 * New BSD License (3-clause)
 * Copyright (c) 2019-2023, Digital Bazaar, Inc.
 * All rights reserved.
 */
export default {
  name: 'MediatorHeader',
  props: {
    title: {
      type: String,
      required: true
    },
    loading: {
      type: Boolean,
      required: false,
      default: () => false
    }
  }
};
</script>

<style>
</style>
