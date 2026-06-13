<template>
  <MediatorWizard
    :can-web-share="false"
    :credential-request-origin="credentialRequestOrigin"
    :credential-request-origin-manifest="null"
    :has-storage-access="true"
    :hints="hints"
    :interaction-url="interactionUrl"
    :is-first-party="true"
    :loading="false"
    :request-type="requestType"
    :selected-hint="null"
    :show-hint-chooser="showHintChooser"
    @allow="noop()"
    @cancel="noop()"
    @deny="noop()"
    @remove-hint="noop()"
    @select-hint="noop()"
    @web-share="noop()" />
</template>

<script>
/*!
 * New BSD License (3-clause)
 * Copyright (c) 2026, Digital Bazaar, Inc.
 * All rights reserved.
 */
import {computed} from 'vue';
import MediatorWizard from '../components/MediatorWizard.vue';
import {useRoute} from 'vue-router';

/* Dev-only harness for the first party wallet chooser dialog. It mounts the
presentational `MediatorWizard` with fake state driven by URL query params, so
the dialog's layout/CSS can be exercised across wallet counts, the cross-device
QR section, and request types without any CHAPI registration, iframes, or
popups. Registered in `router.js` only outside production. Examples:
  /test/wallet-chooser?hints=5&qr=1
  /test/wallet-chooser?hints=0&qr=1
  /test/wallet-chooser?hints=1&type=permissionRequest */
export default {
  name: 'TestWalletChooser',
  components: {MediatorWizard},
  setup() {
    const route = useRoute();

    const hintCount = computed(() => {
      const n = parseInt(route.query.hints, 10);
      return Number.isFinite(n) && n > 0 ? n : 0;
    });
    const hints = computed(() => {
      // mirror the shape produced by `HintManager._createHint`
      return Array.from({length: hintCount.value}, (_, i) => {
        const n = i + 1;
        const name = `Demo Wallet ${n}`;
        const origin = `https://wallet${n}.example`;
        return {
          name,
          icon: null,
          origin,
          host: `wallet${n}.example`,
          manifest: {},
          hintOption: {
            credentialHandler: `${origin}/wch`,
            credentialHandlerProfiles: [{name, icons: []}]
          }
        };
      });
    });

    // `qr=0`/`qr=false` disable the QR section; any other present value
    // (e.g. `qr=1`) enables it. (A bare query string is always a string,
    // so `"0"` would otherwise be truthy.)
    const qrEnabled = computed(() => {
      const v = route.query.qr;
      return v !== undefined && v !== '0' && v !== 'false';
    });
    const interactionUrl = computed(() =>
      qrEnabled.value ? 'https://verifier.example/exchanges/z123' : '');

    const requestType = computed(() =>
      route.query.type || 'credentialRequest');

    const credentialRequestOrigin = computed(() =>
      route.query.origin || 'https://verifier.example');

    /* mirror `FirstPartyMediatorWizard`: the chooser is shown for every
    request type except a permission request (which shows the allow/deny
    greeting instead). This is what surfaces the chooser with zero hints. */
    const showHintChooser = computed(() =>
      requestType.value !== 'permissionRequest');

    const noop = () => {};

    return {
      credentialRequestOrigin, hints, interactionUrl, noop, requestType,
      showHintChooser
    };
  }
};
</script>

<style>
</style>
