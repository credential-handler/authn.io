<template>
  <div>
    Allow Wallet Dialog: {{relyingOriginName}}
    <div
      class="wrm-button-bar"
      style="margin: auto; padding-top: 1em;">
      <button
        type="button"
        class="wrm-button wrm-primary"
        style="margin: auto"
        :disabled="loading"
        @click="deny()">
        Block
      </button>
      <button
        type="button"
        class="wrm-button wrm-primary"
        style="margin: auto"
        :disabled="loading"
        @click="allow()">
        Allow
      </button>
    </div>
  </div>
</template>

<script>
/*!
 * New BSD License (3-clause)
 * Copyright (c) 2017-2022, Digital Bazaar, Inc.
 * All rights reserved.
 */
import {CredentialEventProxy} from './CredentialEventProxy.js';
import {loadPolyfill} from './mediatorPolyfill.js';
import {parseUrl} from './helpers.js';

export default {
  name: 'AllowWalletDialog',
  data() {
    return {
      event: null,
      loading: false,
      relyingDomain: null,
      relyingOrigin: null,
      relyingOriginManifest: null
    };
  },
  computed: {
    relyingOriginName() {
      if(!this.relyingOriginManifest) {
        return this.relyingDomain;
      }
      const {name, short_name} = this.relyingOriginManifest;
      return name || short_name || this.relyingDomain;
    }
  },
  async created() {
    this._setup().catch(console.error);
  },
  methods: {
    async _setup() {
      this.loading = true;

      // create promise to resolve credential request origin once received
      let _resolveCredentialRequestOrigin = null;
      let _rejectCredentialRequestOrigin = null;
      const credentialRequestOrigin = new Promise((resolve, reject) => {
        _resolveCredentialRequestOrigin = resolve;
        _rejectCredentialRequestOrigin = reject;
      });

      try {
        const proxy = new CredentialEventProxy();
        const rpcServices = proxy.createServiceDescription();
        // FIXME: move loading polyfill outside of Vue space
        await loadPolyfill({
          component: this,
          credentialRequestOrigin,
          rpcServices
        });

        const event = this.event = await proxy.receive();
        _resolveCredentialRequestOrigin(event.credentialRequestOrigin);
        this.relyingOrigin = event.credentialRequestOrigin;
        this.relyingOriginManifest = event.credentialRequestOriginManifest;

        const {host} = parseUrl({url: event.relyingOrigin});
        this.relyingDomain = host;
      } catch(e) {
        _rejectCredentialRequestOrigin(e);
        throw e;
      } finally {
        this.loading = false;
      }
    },
    closeWindow() {
      window.close();
    },
    allow() {
      this.event.respondWith({status: {state: 'granted'}});
    },
    deny() {
      this.event.respondWith({status: {state: 'denied'}});
    }
  }
};
</script>

<style>
</style>
