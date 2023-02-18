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
    @back="cancel()">
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
          <HintChooserMessage
            :loading="loading"
            :relying-origin="relyingOrigin"
            :relying-origin-manifest="relyingOriginManifest"
            :request-type="display"
            :show-warning="hintOptions.length === 0"
            @close="cancel()" />
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
import {FirstPartyMediator} from '../mediator/FirstPartyMediator.js';
import {getOriginName} from '../mediator/helpers.js';
import HintChooserMessage from './HintChooserMessage.vue';
import MediatorHeader from './MediatorHeader.vue';

// FIXME: rename this component to avoid confusion with WrmHintChooser
export default {
  name: 'HintChooser',
  components: {HintChooserMessage, MediatorHeader},
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
            this.hintOptions = mediator.hintManager.hintOptions;
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
    cancel() {
      window.close();
    },
    async selectHint({hint}) {
      // FIXME: should the display be immediately hidden?
      this.selectedHint = hint;
      return this._mediator.selectHint({hint});
    },
    async removeHint(event) {
      const {hint} = event;
      const {_mediator: {hintManager}} = this;
      if(hintManager.hintOptions.length === 1) {
        this.loading = true;
      }
      try {
        await hintManager.removeHint({hint});
        this.hintOptions = hintManager.hintOptions;
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
