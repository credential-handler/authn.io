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
      :origin="relyingOrigin"
      :manifest="relyingOriginManifest" />
  </div>
</template>

<script>
/*!
 * New BSD License (3-clause)
 * Copyright (c) 2019-2021, Digital Bazaar, Inc.
 * All rights reserved.
 */
export default {
  name: 'MediatorGreeting',
  components: {},
  props: {
    display: {
      type: String,
      required: true
    },
    relyingOrigin: {
      type: String,
      required: true
    },
    relyingOriginManifest: {
      type: Object,
      required: false,
      default: () => null
    }
  }
};
</script>

<style>
</style>
