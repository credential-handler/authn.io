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
    @back="cancel()"
    @cancel="cancel()">
    <template slot="header">
      <MediatorHeader
        title="Choose a Wallet"
        :loading="loading" />
    </template>
    <template slot="body">
      <mediator-greeting
        :icon-size="greetingIconSize"
        :credential-request-origin="credentialRequestOrigin"
        :credential-request-origin-manifest="credentialRequestOriginManifest"
        :request-type="requestType" />

      <!-- separator between greeting and hint chooser -->
      <div class="wrm-modal-content-header" />

      <HintChooser
        v-if="showHintChooser"
        :hints="hints"
        :loading="loading"
        :credential-request-origin="credentialRequestOrigin"
        :credential-request-origin-manifest="credentialRequestOriginManifest"
        :request-type="requestType"
        @cancel="cancel()"
        @confirm="selectHint"
        @remove-hint="removeHint"
        @select-hint="selectHint"
        @web-share="webShare()" />
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
import HintChooser from './HintChooser.vue';
import MediatorGreeting from './MediatorGreeting.vue';
import MediatorHeader from './MediatorHeader.vue';

export default {
  name: 'FirstPartyMediatorWizard',
  components: {HintChooser, MediatorGreeting, MediatorHeader},
  data() {
    return {
      // FIXME: audit whether all of these are needed
      credential: null,
      credentialRequestOptions: null,
      requestType: null,
      greetingIconSize: 36,
      hints: [],
      loading: true,
      credentialRequestOrigin: '',
      credentialRequestOriginManifest: null,
      selectedHint: null,
      showHintChooser: false
    };
  },
  async created() {
    this._setup().catch(console.error);
  },
  methods: {
    async _setup() {
      try {
        const mediator = new FirstPartyMediator();
        this._mediator = mediator;

        await mediator.initialize({
          show: ({requestType}) => {
            this.loading = true;
            this.requestType = requestType;
            this.showHintChooser = true;
          },
          hide: () => this.reset(),
          ready: () => {
            this.hints = mediator.hintManager.hints.slice();
            this.loading = false;
          }
        });

        // FIXME: use computed vars from mediator properties instead
        this.credentialRequestOrigin = mediator.credentialRequestOrigin;
        this.credentialRequestOriginManifest =
          mediator.credentialRequestOriginManifest;
        this.registrationHintOption = mediator.registrationHintOption;
        this.credential = mediator.credential;
        this.credentialRequestOptions = mediator.credentialRequestOptions;
      } finally {
        this.loading = false;
      }
    },
    async cancel() {
      await this._mediator.cancel();
    },
    selectHint(event) {
      const {hint} = event;
      this.selectedHint = hint;
      event.waitUntil(this._mediator.selectHint({hint}));
    },
    async removeHint(event) {
      const {hint} = event;
      const {_mediator: {hintManager}} = this;
      this.loading = true;
      this.hints = [];
      const promise = hintManager.removeHint({hint});
      event.waitUntil(promise.catch(() => {}));
      try {
        await promise;
      } finally {
        this.hints = hintManager.hints.slice();
        this.loading = false;
      }
    },
    reset() {
      this.credentialRequestOptions = this.credential = null;
      this.requestType = null;
      this.hints = [];
      this.loading = false;
      this.selectedHint = null;
      this.showHintChooser = false;
    },
    async webShare() {
      await this._mediator.webShare();
    }
  }
};
</script>

<style>
</style>
