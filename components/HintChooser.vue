<template>
  <div>
    <wrm-wizard-dialog
      style="width: 100vw; height: 100vh;"
      :loading="loading"
      :first="false"
      :has-next="false"
      :blocked="loading || !selectedHint"
      hide-cancel-button
      @back="closeWindow">
      <template slot="header">
        <div style="font-size: 18px; font-weight: bold; user-select: none">
          <div style="margin-left: -10px">
            <span v-if="selectedHint">Loading Wallet...
              <i class="fas fa-cog fa-spin" />
            </span>
            <span v-else>Choose a Wallet</span>
          </div>
        </div>
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
              style="margin: auto; padding-top: 2em;">
              <button
                type="button"
                class="wrm-button wrm-primary"
                style="margin: auto"
                :disabled="loading"
                @click="webShare()">
                Share with Native App
              </button>
            </div>
          </template>
        </wrm-hint-chooser>
        <div
          v-else-if="selectedHint"
          style="padding-top: 15px">
          <wrm-hint
            :hint="selectedHint"
            default-icon="fas fa-wallet"
            :active="true"
            :selected="true"
            :selectable="false"
            :disabled="true" />
        </div>
      </template>
      <template slot="footer">
        <div />
      </template>
    </wrm-wizard-dialog>
  </div>
</template>

<script>
/*!
 * New BSD License (3-clause)
 * Copyright (c) 2017-2022, Digital Bazaar, Inc.
 * All rights reserved.
 */
import {CredentialEventProxy} from './CredentialEventProxy.js';
import {hintChooserMixin} from './hintChooserMixin.js';
import {loadPolyfill} from './mediatorPolyfill.js';

export default {
  name: 'HintChooser',
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
      const proxy = new CredentialEventProxy();
      const rpcServices = proxy.createServiceDescription();
      // TODO: is this the appropriate place to run this?
      await loadPolyfill(this, rpcServices);

      const event = this.event = await proxy.receive();
      this.credential = event.credential;
      this.credentialRequestOptions = event.credentialRequestOptions;
      this.showHintChooser = true;

      await this.loadHints();

      this.loading = false;
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
