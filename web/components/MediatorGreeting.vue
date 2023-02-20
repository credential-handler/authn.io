<template>
  <div style="user-select: none">
    <div style="font-size: 14px; padding-top: 10px">
      The following website wants to {{websiteDesire}}
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
    },
    requestType: {
      type: String,
      required: true
    }
  },
  computed: {
    websiteDesire() {
      if(this.requestType === 'credentialRequest') {
        return 'receive credentials from you:';
      }
      if(this.requestType === 'credentialStore') {
        return 'send credentials to you:';
      }
      return 'manage credentials for you:';
    }
  }
};
</script>

<style>
</style>
