<template>
  <div>
    <div style="font-size: 14px; padding-top: 10px">
      The following website wants to
      <span v-if="display === 'credentialRequest'">
        receive credentials from you:
      </span>
      <span v-else-if="display === 'credentialStore'">
        send credentials to you:
      </span>
      <span v-else>manage credentials for you:</span>
    </div>
    <wrm-origin-card
      style="padding: 20px 0 10px 0"
      :icon-size="iconSize"
      :origin="credentialRequestOrigin"
      :manifest="credentialRequestOriginManifest" />
  </div>
</template>

<script>
/*!
 * New BSD License (3-clause)
 * Copyright (c) 2019-2023, Digital Bazaar, Inc.
 * All rights reserved.
 */
export default {
  name: 'MediatorGreeting',
  props: {
    display: {
      type: String,
      required: true
    },
    iconSize: {
      type: Number,
      required: false,
      default: () => 48
    },
    credentialRequestOrigin: {
      type: String,
      required: true
    },
    credentialRequestOriginManifest: {
      type: Object,
      required: false,
      default: () => null
    }
  }
};
</script>

<style>
</style>
