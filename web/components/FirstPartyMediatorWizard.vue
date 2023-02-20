<template>
  <!-- blank screen once hint is selected and wallet window is loading -->
  <div v-if="selectedHint" />
  <MediatorWizard
    v-else
    class="wrm-modal-1p"
    style="width: 100vw; height: 100vh;"
    :credential-request-origin="credentialRequestOrigin"
    :credential-request-origin-manifest="credentialRequestOriginManifest"
    :first-party-mode="true"
    :hints="hints"
    :loading="loading"
    :popup-open="true"
    :request-type="requestType"
    :selected-hint="selectedHint"
    :show-hint-chooser="true"
    @cancel="cancel()"
    @remove-hint="removeHint"
    @select-hint="selectHint"
    @web-share="webShare" />
</template>

<script>
/*!
 * New BSD License (3-clause)
 * Copyright (c) 2017-2023, Digital Bazaar, Inc.
 * All rights reserved.
 */
import {FirstPartyMediator} from '../mediator/FirstPartyMediator.js';
import MediatorWizard from './MediatorWizard.vue';

export default {
  name: 'FirstPartyMediatorWizard',
  components: {MediatorWizard},
  data() {
    return {
      credentialRequestOrigin: '',
      credentialRequestOriginManifest: null,
      hints: [],
      loading: true,
      requestType: null,
      selectedHint: null
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
      this.hints = [];
      this.loading = false;
      this.requestType = null;
      this.selectedHint = null;
    },
    async webShare() {
      await this._mediator.webShare();
    }
  }
};
</script>

<style>
</style>
