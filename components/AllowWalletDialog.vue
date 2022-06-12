<template>
  <div class="wrm-modal">
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
          :origin="relyingOrigin"
          :manifest="relyingOriginManifest" />
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
 * Copyright (c) 2017-2022, Digital Bazaar, Inc.
 * All rights reserved.
 */
import {CredentialEventProxy} from './CredentialEventProxy.js';
import {loadPolyfill} from './mediatorPolyfill.js';
import {parseUrl} from './helpers.js';
import {PermissionManager} from 'credential-mediator-polyfill';

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
    async allow() {
      this.loading = true;
      const {relyingOrigin} = this;
      const status = {state: 'granted'};
      await setPermission({relyingOrigin, status});
      this.event.respondWith({status});
    },
    async deny() {
      this.loading = true;
      const {relyingOrigin} = this;
      const status = {state: 'denied'};
      await setPermission({relyingOrigin, status});
      this.event.respondWith({status});
    }
  }
};

async function setPermission({relyingOrigin, status}) {
  try {
    const pm = new PermissionManager(relyingOrigin, {request: () => status});
    pm._registerPermission('credentialhandler');
    await pm.request({name: 'credentialhandler'});
  } catch(e) {
    console.error(e);
  }
}
</script>

<style>
</style>
