<template>
  <!-- blank screen once hint is selected and wallet window is loading -->
  <div v-if="selectedHint" />
  <wrm-wizard-dialog
    v-else-if="!selectedHint"
    class="wrm-modal-1p"
    style="width: 100vw; height: 100vh;"
    :loading="loading"
    :first="false"
    :has-next="false"
    :blocked="loading || !selectedHint"
    hide-cancel-button
    @back="closeWindow">
    <template slot="header">
      <MediatorHeader title="Choose a Wallet" />
    </template>
    <template slot="body">
      <wrm-hint-chooser
        v-if="showHintChooser"
        style="user-select: none"
        :hints="hintOptions"
        :cancel-remove-hint-timeout="5000"
        :hint-removal-text="hintRemovalText"
        default-hint-icon="fas fa-wallet"
        enable-remove-hint
        @remove-hint="removeHint"
        @confirm="selectHint"
        @cancel="cancel()">
        <template slot="message">
          <div style="padding-top: 10px">
            <div v-if="loading">
              Loading options... <i class="fas fa-cog fa-spin" />
            </div>
            <div
              v-else-if="hintOptions.length === 0"
              style="font-size: 14px">
              <div style="font-weight: bold">
                Warning
              </div>
              <div v-if="display === 'credentialRequest'">
                <p>
                  You don't have the credentials requested by this website.
                  Please check <strong>{{relyingOriginName}}</strong> to find
                  out how to obtain the credentials you need to continue.
                </p>
                <p>
                  It may also be that your browser has unregistered your
                  credential wallet. This does not mean your credentials have
                  been removed or lost. Please simply visit your credential
                  wallet website to register again.
                </p>
              </div>
              <div v-else>
                <p>
                  You don't have a credential wallet to store credentials or
                  your browser has recently unregistered your wallet. This
                  does not mean your credentials have been removed or lost.
                  Please simply visit your credential wallet website to
                  register again.
                </p>
              </div>
              <div
                class="wrm-button-bar"
                style="margin-top: 10px">
                <button
                  type="button"
                  class="wrm-button wrm-primary"
                  :disabled="loading"
                  @click="cancel()">
                  Close
                </button>
              </div>
            </div>
          </div>
        </template>
        <template
          v-if="hintOptions.length > 0"
          slot="hint-list-footer">
          <div
            class="wrm-button-bar"
            style="margin: auto; padding-top: 1em;">
            <button
              type="button"
              class="wrm-button"
              style="margin: auto"
              :disabled="loading"
              @click="webShare()">
              Select Native App Instead
            </button>
          </div>
        </template>
      </wrm-hint-chooser>
    </template>
    <template slot="footer">
      <div />
    </template>
  </wrm-wizard-dialog>
</template>

<script>
/*!
 * New BSD License (3-clause)
 * Copyright (c) 2017-2023, Digital Bazaar, Inc.
 * All rights reserved.
 */
import {CredentialEventProxy} from '../CredentialEventProxy.js';
import {hintChooserMixin} from './hintChooserMixin.js';
import {loadPolyfill} from '../mediatorPolyfill.js';
import MediatorHeader from './MediatorHeader.vue';

export default {
  name: 'HintChooser',
  components: {MediatorHeader},
  mixins: [hintChooserMixin],
  data() {
    return {
      event: null
    };
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
        this.credential = event.credential;
        this.credentialRequestOptions = event.credentialRequestOptions;
        this.relyingOriginManifest = event.credentialRequestOriginManifest;
        this.showHintChooser = true;
        this.display = this.credential ?
          'credentialStore' : 'credentialRequest';

        await this.loadHints();
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
    async selectHint({hint}) {
      this.selectedHint = hint;
      this.event.respondWith({choice: {hint}});
    }
  }
};
</script>

<style>
</style>
