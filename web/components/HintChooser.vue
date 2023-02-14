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
      <!-- move what is common between here and MediatorWizard into its own
      component -->
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
import {FirstPartyMediator} from '../FirstPartyMediator.js';
import {getOriginName} from '../helpers.js';
import MediatorHeader from './MediatorHeader.vue';

// FIXME: rename this component to avoid confusion with WrmHintChooser
export default {
  name: 'HintChooser',
  components: {MediatorHeader},
  data() {
    return {
      // FIXME: audit whether all of these are needed
      credential: null,
      credentialRequestOptions: null,
      display: null,
      hintOptions: [],
      hintRemovalText: 'Hiding...',
      loading: false,
      relyingOrigin: null,
      relyingOriginManifest: null,
      selectedHint: null,
      showHintChooser: false
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

      try {
        const mediator = new FirstPartyMediator();
        this._mediator = mediator;

        await mediator.initialize({
          // FIXME: show may not be needed
          show: ({requestType}) => {
            console.log('show HintChooser');
            this.loading = true;
            this.display = requestType;
            this.showHintChooser = true;
          },
          // FIXME: hide may not be needed
          hide: () => {
            console.log('hide HintChooser');
            this.reset();
          },
          ready: () => {
            console.log('ready HintChooser');
            this.hintOptions = mediator.hintOptions;
            this.loading = false;
          }
        });

        // FIXME: rename, use same as mediator names or remove and just use
        // mediator vars directly
        this.relyingOrigin = mediator.credentialRequestOrigin;
        this.relyingOriginManifest = mediator.credentialRequestOriginManifest;
        this.registrationHintOption = mediator.registrationHintOption;
        this.credential = mediator.credential;
        this.credentialRequestOptions = mediator.credentialRequestOptions;
      } finally {
        this.loading = false;
      }
    },
    closeWindow() {
      window.close();
    },
    async selectHint({hint}) {
      // FIXME: should the display be immediately hidden?
      this.selectedHint = hint;
      return this._mediator.selectHint({hint});
    },
    async removeHint(event) {
      const {hint} = event;
      if(this._mediator.hintOptions.length === 1) {
        this.loading = true;
      }
      try {
        await this._mediator.removeHint({hint});
        this.hintOptions = this._mediator.hintOptions;
      } catch(e) {
        console.error(e);
      } finally {
        this.loading = false;
      }
    },
    reset() {
      this.credentialRequestOptions = this.credential = null;
      this.display = null;
      this.hintOptions = [];
      this.loading = false;
      this.selectedHint = null;
      this.showHintChooser = false;
    },
    async webShare() {
      return this._mediator.webShare();
    }
  }
};
</script>

<style>
</style>
