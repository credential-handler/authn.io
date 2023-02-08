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
 * Copyright (c) 2017-2023, Digital Bazaar, Inc.
 * All rights reserved.
 */
import {createDefaultHintOption, getOriginName} from '../helpers.js';
import {CredentialEventProxy} from '../CredentialEventProxy.js';
import {loadPolyfill} from '../mediatorPolyfill.js';
import {PermissionManager} from 'credential-mediator-polyfill';

export default {
  name: 'AllowWalletDialog',
  data() {
    return {
      event: null,
      loading: false,
      hintOption: null,
      relyingOrigin: null,
      relyingOriginManifest: null
    };
  },
  computed: {
    relyingOriginName() {
      const {relyingOriginManifest: manifest, relyingOrigin: origin} = this;
      return getOriginName({origin, manifest});
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

        if(!this.relyingOriginManifest) {
          console.error('Missing Web app manifest.');
          event.respondWith({
            error: {
              name: 'NotAllowedError',
              message: 'Missing Web app manifest.'
            }
          });
          return;
        }

        // generate hint option for origin
        this.hintOption = await createDefaultHintOption(
          {origin: this.relyingOrigin, manifest: this.relyingOriginManifest});
        if(!this.hintOption) {
          console.error(
            'Missing or invalid "credential_handler" in Web app manifest.');
          event.respondWith({
            error: {
              name: 'NotAllowedError',
              message:
                'Missing or invalid "credential_handler" in Web app manifest.'
            }
          });
        }
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
      const status = {state: 'granted'};
      const {hintOption} = this;
      if(!hintOption) {
        return this.deny();
      }
      const {credentialHandler, credentialHintKey, enabledTypes} = hintOption;
      const hint = {name: credentialHintKey, enabledTypes};
      await navigator.credentialMediator.ui.registerCredentialHandler(
        credentialHandler, hint);
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
