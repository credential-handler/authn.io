<template>
  <!-- blank screen while credential request is loading -->
  <div v-if="!requestType" />
  <MediatorWizard
    v-else
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
import {createApp, ref} from 'vue';
import HandlerWindowHeader from './HandlerWindowHeader.vue';
import MediatorWizard from './MediatorWizard.vue';
import {ThirdPartyMediator} from '../mediator/ThirdPartyMediator.js';
import {WrmCheckbox} from 'vue-web-request-mediator';

export default {
  name: 'ThirdPartyMediatorWizard',
  components: {MediatorWizard, WrmCheckbox},
  // FIXME: replace async setup with onMounted life-cycle hook
  async setup() {
    const mediator = new ThirdPartyMediator();

    const canWebShare = ref(false);
    const credentialRequestOrigin = ref(mediator.credentialRequestOrigin);
    const credentialRequestOriginManifest = ref(null);
    const firstPartyDialogOpen = ref(false);
    const hasStorageAccess = ref(mediator.hasStorageAccess);
    const hints = ref([]);
    const loading = ref(true);
    const rememberChoice = ref(true);
    const requestType = ref(null);
    const selectedHint = ref(null);
    const showHintChooser = ref(false);

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
      const {hint} = event;
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
      const {hint} = event;
      selectedHint.value = hint;
      const promise = mediator.selectHint(
        {hint, rememberChoice: rememberChoice.value});
      event.waitUntil(promise.catch(() => {}));
      try {
        await promise;
      } finally {
        selectedHint.value = null;
        // show hint selection when mediator has storage access
        if(mediator.hasStorageAccess) {
          showHintChooser.value = true;
        }
      }
    };
    const webShare = async () => {
      await mediator.webShare();
    };

    try {
      await mediator.initialize({
        show: ({requestType: _requestType}) => {
          loading.value = true;
          requestType.value = _requestType;
          showHintChooser.value = false;

          // determine web share capability
          mediator.getWebShareHandler()
            .then(({enabled}) => canWebShare.value = enabled);

          // if the web app manifest loads, use it
          mediator.credentialRequestOriginManifestPromise.then(manifest => {
            credentialRequestOriginManifest.value = manifest;
          });
        },
        hide: () => {
          hints.value = [];
          loading.value = false;
          firstPartyDialogOpen.value = false;
          rememberChoice.value = true;
          requestType.value = null;
          selectedHint.value = null;
          showHintChooser.value = false;
        },
        ready: () => {
          hints.value = mediator.hintManager.hints.slice();
          // FIXME: make `showHintChooser` a computed var
          if(mediator.hasStorageAccess &&
            requestType.value !== 'permissionRequest') {
            showHintChooser.value = true;
          }
          loading.value = false;
        },
        showHandlerWindow: ({webAppWindow}) =>
          _showHandlerWindow({webAppWindow, mediator})
      });
    } catch(e) {
      console.error('Error initializing mediator:', e);
    }

    return {
      // data
      canWebShare, credentialRequestOrigin, credentialRequestOriginManifest,
      firstPartyDialogOpen, hasStorageAccess, hints, loading,
      rememberChoice, requestType, selectedHint, showHintChooser,
      // methods
      allow, cancel, deny, focusFirstPartyDialog, openFirstPartyDialog,
      removeHint, selectHint, webShare
    };
  }
};

function _showHandlerWindow({webAppWindow, mediator}) {
  console.log('_showHandlerWindow');

  // clear iframe style that was set by web-request-rpc; set instead via CSS
  const {container, iframe} = webAppWindow.dialog;
  iframe.style.cssText = null;
  iframe.classList.add('wrm-handler-iframe');

  // attach handler window header
  const el = document.createElement('div');
  container.insertBefore(el, iframe);
  container.classList.add('wrm-slide-up');
  const component = createApp({extends: HandlerWindowHeader}, {
    hint: mediator.selectedHint,
    onBack: mediator.cancelSelection.bind(mediator),
    onCancel: mediator.cancel.bind(mediator)
    // FIXME: determine if `component.unmount()` and `el.remove()` need to
    // be called
  });
  component.mount(el);
 /*
  const {container, iframe} = webAppWindow.dialog;
  const Component = Vue.extend(HandlerWindowHeader);
  const el = document.createElement('div');
  container.insertBefore(el, iframe);
  container.classList.add('wrm-slide-up');
  new Component({
    el,
    propsData: {
      hint: mediator.selectedHint
    },
    created() {
      this.$on('back', mediator.cancelSelection.bind(mediator));
      this.$on('cancel', mediator.cancel.bind(mediator));
    }
  });
  // clear iframe style that was set by web-request-rpc; set instead via CSS
  iframe.style.cssText = null;
  iframe.classList.add('wrm-handler-iframe');*/
}
</script>

<style>
</style>
