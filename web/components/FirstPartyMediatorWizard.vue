<template>
  <!-- blank screen once hint is selected and wallet window is loading -->
  <div v-if="show && selectedHint" />
  <MediatorWizard
    v-else-if="show"
    :can-web-share="canWebShare"
    :credential-request-origin="credentialRequestOrigin"
    :credential-request-origin-manifest="credentialRequestOriginManifest"
    :has-storage-access="true"
    :hints="hints"
    :interaction-url="interactionUrl"
    :is-first-party="true"
    :loading="loading"
    :request-type="requestType"
    :selected-hint="selectedHint"
    :show-hint-chooser="showHintChooser"
    @allow="allow()"
    @cancel="cancel()"
    @cross-device="crossDevice()"
    @deny="deny()"
    @remove-hint="removeHint"
    @select-hint="selectHint"
    @web-share="webShare" />
</template>

<script>
/*!
 * New BSD License (3-clause)
 * Copyright (c) 2017-2026, Digital Bazaar, Inc.
 */
import {computed, nextTick, onMounted, ref, toRaw} from 'vue';
import {FirstPartyMediator} from '../mediator/FirstPartyMediator.js';
import {fitWindowToContent} from '../mediator/helpers.js';
import MediatorWizard from './MediatorWizard.vue';

// give up waiting on a slow wallet icon rather than delay the resize; a late
// image just means the popup is corrected without its height
const IMAGE_LOAD_TIMEOUT = 1000;

/* Resolves once every <img> in the document has settled (loaded or errored),
or the timeout elapses. An icon that has not loaded reports no height, so
measuring before it settles under-reports the content. */
async function _waitForImages() {
  const images = [...document.querySelectorAll('img')]
    .filter(img => !img.complete);
  if(images.length === 0) {
    return;
  }
  const settled = images.map(img => new Promise(resolve => {
    img.addEventListener('load', resolve, {once: true});
    img.addEventListener('error', resolve, {once: true});
  }));
  let timer;
  const timeout = new Promise(resolve => {
    timer = setTimeout(resolve, IMAGE_LOAD_TIMEOUT);
  });
  try {
    await Promise.race([Promise.all(settled), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

export default {
  name: 'FirstPartyMediatorWizard',
  components: {MediatorWizard},
  setup() {
    const mediator = new FirstPartyMediator();

    const canWebShare = ref(false);
    const credentialRequestOrigin = ref('');
    const credentialRequestOriginManifest = ref(null);
    const hints = ref([]);
    const interactionUrl = ref('');
    const loading = ref(true);
    const requestType = ref('');
    const selectedHint = ref(null);
    const show = ref(true);

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
    const crossDevice = async () => {
      loading.value = true;
      return mediator.crossDevice();
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
            show.value = true;
            loading.value = true;
            requestType.value = _requestType;

            // determine web share capability
            mediator.getWebShareHandler()
              .then(({enabled}) => canWebShare.value = enabled);
          },
          hide: () => {
            show.value = false;
            hints.value = [];
            interactionUrl.value = '';
            loading.value = false;
            requestType.value = '';
            selectedHint.value = null;
          },
          ready: async () => {
            hints.value = mediator.hintManager.hints.slice();
            interactionUrl.value = mediator.getInteractionUrl() || '';
            credentialRequestOriginManifest.value =
              await mediator.credentialRequestOriginManifestPromise;
            credentialRequestOrigin.value = mediator.credentialRequestOrigin;
            loading.value = false;

            /* Correct the popup height now that the real content is known.
            The height requested when opening the popup is a guess: the
            browser subtracts its own chrome by an unpredictable amount and
            the greeting reflows with the wallet's name and origin. Measuring
            here replaces both guesses. Waits for the DOM update and for the
            wallet icon to load, since an image that has not loaded yet does
            not contribute its height. */
            await nextTick();
            await _waitForImages();
            fitWindowToContent();
          }
        });
      } catch(e) {
        console.error('Error initializing mediator:', e);
      }
    });

    return {
      // data
      canWebShare, credentialRequestOrigin, credentialRequestOriginManifest,
      hints, interactionUrl, loading, requestType, selectedHint, show,
      showHintChooser,
      // methods
      allow, cancel, crossDevice, deny, removeHint, selectHint, webShare
    };
  }
};
</script>

<style>
</style>
