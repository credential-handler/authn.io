<template>
  <div v-if="loading" />
  <div
    v-else
    class="wrm-modal wrm-modal-1p">
    <div class="wrm-modal-content wrm-modern">
      <div class="wrm-flex-row wrm-modal-content-header wrm-modern">
        <div
          class="wrm-flex-item-grow"
          style="padding: 6px 15px; overflow: hidden;">
          <div style="font-size: 18px; font-weight: bold; user-select: none">
            Allow Wallet
          </div>
        </div>
      </div>
      <div>
        <div style="font-size: 14px; padding-top: 10px">
          The following website wants to manage credentials for you:
        </div>
        <wrm-origin-card
          style="padding: 20px 0 10px 0"
          :origin="credentialRequestOrigin"
          :manifest="credentialRequestOriginManifest" />
      </div>
      <div>
        <!-- div class="wrm-separator"></div -->
        <div
          class="wrm-button-bar"
          style="margin-top: 10px">
          <button
            type="button"
            class="wrm-button"
            :disabled="loading"
            @click="deny()">
            Block
          </button>
          <button
            type="button"
            class="wrm-button wrm-primary"
            style="margin-left: 5px"
            :disabled="loading"
            @click="allow()">
            Allow
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
/*!
 * New BSD License (3-clause)
 * Copyright (c) 2017-2023, Digital Bazaar, Inc.
 * All rights reserved.
 */
import {FirstPartyMediator} from '../mediator/FirstPartyMediator.js';

export default {
  name: 'AllowWalletDialog',
  data() {
    return {
      loading: false,
      credentialRequestOrigin: null,
      credentialRequestOriginManifest: null
    };
  },
  async created() {
    this._setup().catch(console.error);
  },
  methods: {
    async _setup() {
      this.loading = true;
      try {
        const mediator = new FirstPartyMediator();
        this._mediator = mediator;
        await mediator.initialize({
          show: () => this.loading = true,
          hide: () => this.loading = false,
          ready: () => this.loading = false
        });

        // FIXME: rename, use same as mediator names or remove and just use
        // mediator vars directly
        this.credentialRequestOrigin = mediator.credentialRequestOrigin;
        this.credentialRequestOriginManifest =
          mediator.credentialRequestOriginManifest;
        this.registrationHintOption = mediator.registrationHintOption;
      } finally {
        this.loading = false;
      }
    },
    closeWindow() {
      window.close();
    },
    async allow() {
      this.loading = true;
      await this._mediator.allowCredentialHandler();
    },
    async deny() {
      this.loading = true;
      await this._mediator.denyCredentialHandler();
    }
  }
};
</script>

<style>
</style>
