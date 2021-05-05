<template>
  <div
    class="wrm-flex-column"
    style="font-family: Arial; height: 100vh; justify-content: center">
    <div style="padding-bottom: 10px; font-size: 14px;">
      Credential Wallet authorized! Please click below to close this window.
    </div>

    <div
      class="wrm-button-bar"
      style="margin-top: 10px; font-size: 12px">
      <button
        type="button"
        class="wrm-button wrm-primary"
        @click="onClose()">
        Close
      </button>
    </div>
  </div>
</template>

<script>
/*!
 * New BSD License (3-clause)
 * Copyright (c) 2019-2021, Digital Bazaar, Inc.
 * All rights reserved.
 */
export default {
  name: 'AllowWalletAccess',
  methods: {
    async onClose() {
      window.close();
    }
  }
};

</script>

<style>
</style>
