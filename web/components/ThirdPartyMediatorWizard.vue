<template>
  <MediatorWizard
    v-if="show"
    :can-web-share="canWebShare"
    :credential-request-origin="credentialRequestOrigin"
    :credential-request-origin-manifest="credentialRequestOriginManifest"
    :first-party-dialog-open="firstPartyDialogOpen"
    :has-storage-access="hasStorageAccess"
    :hints="hints"
    :loading="loading"
    :request-type="requestType"
    :selected-hint="selectedHint"
    :show-hint-chooser="showHintChooser"
    @allow="allow()"
    @cancel="cancel()"
    @deny="deny()"
    @focus-first-party-dialog="focusFirstPartyDialog()"
    @open-first-party-dialog="openFirstPartyDialog()"
    @remove-hint="removeHint"
    @select-hint="selectHint"
    @web-share="webShare">
    <template #hint-list-footer>
      <div
        v-if="hints.length > 0"
        style="margin: 10px -15px 0px -15px; padding: 15px 15px 0px 15px;"
        class="wrm-separator wrm-modern">
        <WrmCheckbox
          v-model="rememberChoice"
          checkbox-class="wrm-blue"
          checkbox-style="font-size: 14px"
          label="Remember my choice for this site"
          label-class="wrm-dark-gray" />
      </div>
    </template>
  </MediatorWizard>
</template>

<script>
/*!
 * New BSD License (3-clause)
 * Copyright (c) 2017-2023, Digital Bazaar, Inc.
 * All rights reserved.
 */
import {computed, createApp, onMounted, ref, toRaw} from 'vue';
import HandlerWindowHeader from './HandlerWindowHeader.vue';
import MediatorWizard from './MediatorWizard.vue';
import {ThirdPartyMediator} from '../mediator/ThirdPartyMediator.js';
import {WrmCheckbox} from 'vue-web-request-mediator';

// eslint-disable-next-line vue/one-component-per-file
export default {
  name: 'ThirdPartyMediatorWizard',
  components: {MediatorWizard, WrmCheckbox},
  setup() {
    const mediator = new ThirdPartyMediator();

    const canWebShare = ref(false);
    const credentialRequestOrigin = ref(mediator.credentialRequestOrigin);
    const credentialRequestOriginManifest = ref(null);
    const firstPartyDialogOpen = ref(false);
    const hasStorageAccess = ref(mediator.hasStorageAccess);
    const hints = ref([]);
    const loading = ref(true);
    const rememberChoice = ref(false);
    const requestType = ref('');
    const selectedHint = ref(null);
    const show = ref(true);

    const showHintChooser = computed(() =>
      hasStorageAccess.value && requestType.value !== 'permissionRequest');

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
    const selectHint = async event => {
      const hint = toRaw(event.hint);
      selectedHint.value = hint;
      const promise = mediator.selectHint(
        {hint, rememberChoice: rememberChoice.value});
      event.waitUntil(promise.catch(() => {}));
      try {
        await promise;
      } finally {
        selectedHint.value = null;
      }
    };
    const focusFirstPartyDialog = () => mediator.focusFirstPartyDialog();
    const openFirstPartyDialog = async () => {
      loading.value = true;
      try {
        // FIXME: bikeshed this approach to handling 1p dialog state changes
        const opened = () => firstPartyDialogOpen.value = true;
        const closed = () => firstPartyDialogOpen.value = false;

        // handle permission request case
        if(requestType.value === 'permissionRequest') {
          await mediator.handlePermissionRequestWithFirstPartyMediator(
            {opened, closed});
          return;
        }

        // handle all other cases
        const {choice} = await mediator.getHintChoiceWithFirstPartyMediator(
          {opened, closed});
        // if a choice was made... (vs. closing the window)
        if(choice) {
          selectHint({...choice, waitUntil: () => {}});
        }
      } finally {
        loading.value = false;
      }
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
            loading.value = false;
            firstPartyDialogOpen.value = false;
            rememberChoice.value = false;
            requestType.value = '';
            selectedHint.value = null;
          },
          ready: async () => {
            hints.value = mediator.hintManager.hints.slice();
            credentialRequestOriginManifest.value =
              await mediator.credentialRequestOriginManifestPromise;
            loading.value = false;
          },
          showHandlerWindow: ({webAppWindow}) =>
            _showHandlerWindow({webAppWindow, mediator})
        });
      } catch(e) {
        console.error('Error initializing mediator:', e);
      }
    });

    return {
      // data
      canWebShare, credentialRequestOrigin, credentialRequestOriginManifest,
      firstPartyDialogOpen, hasStorageAccess, hints, loading,
      rememberChoice, requestType, selectedHint, show, showHintChooser,
      // methods
      allow, cancel, deny, focusFirstPartyDialog, openFirstPartyDialog,
      removeHint, selectHint, webShare
    };
  }
};

function _showHandlerWindow({webAppWindow, mediator}) {
  // clear iframe style that was set by web-request-rpc; set instead via CSS
  const {container, iframe} = webAppWindow.dialog;
  iframe.style.cssText = null;
  iframe.classList.add('wrm-handler-iframe');

  // attach handler window header
  const el = document.createElement('div');
  el.style = 'width: 100%';
  container.insertBefore(el, iframe);
  container.classList.add('wrm-slide-up');
  // eslint-disable-next-line vue/one-component-per-file
  const component = createApp(HandlerWindowHeader, {
    hint: mediator.selectedHint,
    onBack: mediator.cancelSelection.bind(mediator),
    onCancel: mediator.cancel.bind(mediator)
  });
  component.mount(el);
}
</script>

<style>
</style>
