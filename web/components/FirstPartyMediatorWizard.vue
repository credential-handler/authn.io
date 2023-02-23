<template>
  <!-- blank screen once hint is selected and wallet window is loading -->
  <div v-if="selectedHint" />
  <MediatorWizard
    v-else
    :can-web-share="canWebShare"
    :credential-request-origin="credentialRequestOrigin"
    :credential-request-origin-manifest="credentialRequestOriginManifest"
    :has-storage-access="true"
    :hints="hints"
    :is-first-party="true"
    :loading="loading"
    :request-type="requestType"
    :selected-hint="selectedHint"
    :show-hint-chooser="showHintChooser"
    @allow="allow()"
    @cancel="cancel()"
    @deny="deny()"
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
import {computed, onMounted, ref, toRaw} from 'vue';
import {FirstPartyMediator} from '../mediator/FirstPartyMediator.js';
import MediatorWizard from './MediatorWizard.vue';

export default {
  name: 'FirstPartyMediatorWizard',
  components: {MediatorWizard},
  setup() {
    const mediator = new FirstPartyMediator();

    const canWebShare = ref(false);
    const credentialRequestOrigin = ref('');
    const credentialRequestOriginManifest = ref(null);
    const hints = ref([]);
    const loading = ref(true);
    const requestType = ref('');
    const selectedHint = ref(null);

    const showHintChooser = computed(() => {
      return requestType.value !== 'permissionRequest';
    });

    const allow = async () => {
      loading.value = true;
      await mediator.allowCredentialHandler();
    };
    const cancel = async () => {
      loading.value = true;
      return mediator.cancel();
    };
    const deny = async () => {
      loading.value = true;
      await mediator.denyCredentialHandler();
    };
    const removeHint = async event => {
      const hint = toRaw(event.hint);
      const {hintManager} = mediator;
      loading.value = true;
      hints.value = [];
      const promise = hintManager.removeHint({hint});
      event.waitUntil(promise.catch(() => {}));
      try {
        await promise;
      } finally {
        hints.value = hintManager.hints.slice();
        loading.value = false;
      }
    };
    const selectHint = async event => {
      const hint = toRaw(event.hint);
      selectedHint.value = hint;
      event.waitUntil(mediator.selectHint({hint}));
    };
    const webShare = async () => {
      await mediator.webShare();
    };

    onMounted(async () => {
      try {
        await mediator.initialize({
          show: ({requestType: _requestType}) => {
            loading.value = true;
            requestType.value = _requestType;

            // determine web share capability
            mediator.getWebShareHandler()
              .then(({enabled}) => canWebShare.value = enabled);
          },
          hide: () => {
            hints.value = [];
            loading.value = false;
            requestType.value = '';
            selectedHint.value = null;
          },
          ready: async () => {
            hints.value = mediator.hintManager.hints.slice();
            credentialRequestOriginManifest.value =
              await mediator.credentialRequestOriginManifestPromise;
            credentialRequestOrigin.value = mediator.credentialRequestOrigin;
            loading.value = false;
          }
        });
      } catch(e) {
        console.error('Error initializing mediator:', e);
      }
    });

    return {
      // data
      canWebShare, credentialRequestOrigin, credentialRequestOriginManifest,
      hints, loading, requestType, selectedHint, showHintChooser,
      // methods
      allow, cancel, deny, removeHint, selectHint, webShare
    };
  }
};
</script>

<style>
</style>
