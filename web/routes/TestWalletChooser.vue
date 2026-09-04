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
    :wallet-app-url="walletAppUrl"
    :wallet-web-url="walletWebUrl"
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
 */
import {IS_MOBILE_DEVICE, SUPPORTS_WEB_WALLET_LINK}
  from '../mediator/constants.js';
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
  /test/wallet-chooser?hints=1&qr=1&link=0
  /test/wallet-chooser?hints=1&qr=1&app=1
  /test/wallet-chooser?hints=1&qr=1&web=0
  /test/wallet-chooser?hints=1&type=permissionRequest
  /test/wallet-chooser?hints=2&jit=2&qr=1 */
export default {
  name: 'TestWalletChooser',
  components: {MediatorWizard},
  setup() {
    const route = useRoute();

    const credentialRequestOrigin = computed(() =>
      route.query.origin || 'https://verifier.example');

    const hintCount = computed(() => {
      const n = parseInt(route.query.hints, 10);
      return Number.isFinite(n) && n > 0 ? n : 0;
    });
    /* `jit=N` adds N recommended (just-in-time) wallets after the
    registered ones. `HintManager` builds these from the relying party's
    `recommendedHandlerOrigins`, and `WrmHintList` renders them in their own
    section below a separator, so the chooser looks different when they are
    present -- a state worth capturing. */
    const jitCount = computed(() => {
      const n = parseInt(route.query.jit, 10);
      return Number.isFinite(n) && n > 0 ? n : 0;
    });
    const hints = computed(() => {
      // mirror the shape produced by `HintManager._createHint`
      const makeHint = ({n, jit}) => {
        const name = jit ? `Recommended Wallet ${n}` : `Demo Wallet ${n}`;
        const origin = jit ?
          `https://recommended${n}.example` : `https://wallet${n}.example`;
        const hint = {
          name,
          icon: null,
          origin,
          host: new URL(origin).host,
          manifest: {},
          hintOption: {
            credentialHandler: `${origin}/wch`,
            credentialHandlerProfiles: [{name, icons: []}]
          }
        };
        if(jit) {
          // mirror `_createJitHints`: with no manifest the relying party's
          // name falls back to its host
          const rpOrigin = credentialRequestOrigin.value;
          hint.jit = {
            recommendedBy: {
              name: new URL(rpOrigin).host,
              origin: rpOrigin,
              manifest: null
            }
          };
        }
        return hint;
      };
      return [
        ...Array.from({length: hintCount.value},
          (_, i) => makeHint({n: i + 1, jit: false})),
        ...Array.from({length: jitCount.value},
          (_, i) => makeHint({n: i + 1, jit: true}))
      ];
    });

    // `qr=0`/`qr=false` disable the QR section; any other present value
    // (e.g. `qr=1`) enables it. (A bare query string is always a string,
    // so `"0"` would otherwise be truthy.)
    const qrEnabled = computed(() => {
      const v = route.query.qr;
      return v !== undefined && v !== '0' && v !== 'false';
    });
    // an interaction URL always carries `iuv=1`, so the fake one does too
    const FAKE_INTERACTION_URL =
      'https://verifier.example/interactions/z123?iuv=1';
    const interactionUrl = computed(() =>
      qrEnabled.value ? FAKE_INTERACTION_URL : '');

    /* `link=0`/`link=false` disable the same-device wallet links; anything
    else leaves them on, so existing harness URLs keep exercising them. The
    mediator derives these from the interaction URL, so they follow `qr`. */
    const linkEnabled = computed(() => {
      const v = route.query.link;
      return v !== '0' && v !== 'false';
    });
    /* the real gates, imported rather than re-implemented so the harness
    cannot drift from them; `app=1`/`app=0` overrides for layout work on a
    project the gate would exclude */
    const appLinkEnabled = computed(() => {
      if(route.query.app !== undefined) {
        return route.query.app !== '0' && route.query.app !== 'false';
      }
      return IS_MOBILE_DEVICE;
    });
    const walletAppUrl = computed(() =>
      qrEnabled.value && linkEnabled.value && appLinkEnabled.value ?
        `interaction:${FAKE_INTERACTION_URL}` : '');
    /* without `registerProtocolHandler()` nothing can claim a `web+`
    scheme, so the row is hidden; `web=1`/`web=0` overrides either way */
    const webLinkEnabled = computed(() => {
      if(route.query.web !== undefined) {
        return route.query.web !== '0' && route.query.web !== 'false';
      }
      return SUPPORTS_WEB_WALLET_LINK;
    });
    const walletWebUrl = computed(() =>
      qrEnabled.value && linkEnabled.value && webLinkEnabled.value ?
        `web+interaction:${FAKE_INTERACTION_URL}` : '');

    const requestType = computed(() =>
      route.query.type || 'credentialRequest');

    /* mirror `FirstPartyMediatorWizard`: the chooser is shown for every
    request type except a permission request (which shows the allow/deny
    greeting instead). This is what surfaces the chooser with zero hints. */
    const showHintChooser = computed(() =>
      requestType.value !== 'permissionRequest');

    const noop = () => {};

    return {
      credentialRequestOrigin, hints, interactionUrl, noop, requestType,
      showHintChooser, walletAppUrl, walletWebUrl
    };
  }
};
</script>

<style>
</style>
