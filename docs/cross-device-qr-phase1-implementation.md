# Implementation Spec: Cross-Device QR Code in the Wallet Chooser (Phase 1)
- **Status:** Draft
  
- **Parent spec:** [cross-device-wallet-selection-spec.md](./cross-device-wallet-selection-spec.md)
  
- **Tracking issue:** [credential-handler/authn.io#166](https://github.com/credential-handler/authn.io/issues/166)
  
- **Author:** DJ Scruggs
  
- **Date:** 2026-06-11
  

Phase 1 only: render the coordinator's interaction URL (`protocols.interact`) as a QR code in the wallet chooser, with the "Already scanned?" Close affordance. The `web+interaction://` link is Phase 2 (gated on scheme agreement) and appears here only where its future insertion point is worth noting.
## Where the chooser actually renders (flow note)
Because partitioned storage is assumed for every browser (v6.0.0), the third-party iframe usually lacks storage access; the user clicks "Next" and the real chooser renders inside the **first-party popup** (`FirstPartyMediatorWizard`). The chooser renders directly in the third-party context only when storage access exists. The QR section lives in `HintChooser.vue`, so it appears automatically in **both** contexts — but manual testing must cover both, and the popup is the common path.

Component/data chain (existing, used by `canWebShare`, mirrored for the interaction URL):

```
ThirdPartyMediatorWizard.vue ──┐
                               ├──> MediatorWizard.vue ──> HintChooser.vue
FirstPartyMediatorWizard.vue ──┘         (props down, events up)
```
## Changed/new files
| File | Change |
|---|---|
| `package.json` | add `qrcode` dependency |
| `web/mediator/BaseMediator.js` | add `getInteractionUrl()` method |
| `web/components/CrossDeviceOptions.vue` | **new** — QR section UI |
| `web/components/HintChooser.vue` | new prop + render section + emit |
| `web/components/MediatorWizard.vue` | thread prop through |
| `web/components/ThirdPartyMediatorWizard.vue` | wire mediator → prop |
| `web/components/FirstPartyMediatorWizard.vue` | wire mediator → prop |

No changes to `lib/` (server), `HintManager.js`, or the polyfills.
## 1. Dependency
```
npm install qrcode
```

`qrcode@^1.5.x` (same library `bedrock-vue-wallet` uses for generation). Browser-safe, works with `@bedrock/webpack`. Use `QRCode.toDataURL(text, opts)` → `<img>`; no canvas ref management and it renders fine inside the dialog's CSS.
## 2. `BaseMediator.getInteractionUrl()` method
`BaseMediator` already holds `credential` (storage), `credentialRequestOptions` (request), set by both subclasses before `ready()` fires. Reuse the established extraction idiom from `_sendCredentialRequestViaUrl()`:

```js
// BaseMediator.js
getInteractionUrl() {
  const {credential, credentialRequestOptions} = this;
  const protocols =
    (credential?.options || credentialRequestOptions?.web)?.protocols || {};
  const url = protocols.interact;
  if(!url) {
    return null;
  }
  try {
    const parsed = new URL(url);
    // interaction URLs are https and always carry `iuv=1` in their value
    if(parsed.protocol !== 'https:' ||
      parsed.searchParams.get('iuv') !== '1') {
      return null;
    }
    return url;
  } catch(e) {
    console.warn(`Invalid relying party interaction URL "${url}".`);
    return null;
  }
}
```

Notes:

- Getter (not cached): trivially cheap, and `credential` / `credentialRequestOptions` change per request.
  
- Permission requests have neither `credential.options` nor `credentialRequestOptions.web`, so the method returns `null` and the section naturally never renders there.
  
- Validation is deliberately stricter than `_hasMatchingProtocol()` (which only checks `new URL`): the QR forwards the URL to another device, so require `https:` and the `iuv=1` marker. **`iuv=1` is a hard requirement, not a heuristic:** per the parent spec's Terminology section, an interaction URL *always* carries `iuv=1` in its value — it is the marker by which a URL is identified as an interaction URL at all, even standalone outside a `protocols` wrapper. A `protocols.interact` value without it is therefore malformed (not an interaction URL), and a wallet scanning a QR of it would have no way to detect what it received. Rendering such a QR would produce broken scans, so the method rejects it (warn + hide section), consistent with how invalid protocol URLs are handled today.
  
## 3. New component: `web/components/CrossDeviceOptions.vue`
Follows the repo's Vue 3 `setup()` style and the existing footer-section styling (`wrm-separator wrm-modern`, `wrm-button`), like the former Web Share button block in `HintChooser.vue`.

- **Props:** `interactionUrl` (String, required), `loading` (Boolean, default `false`).
  
- **Emits:** `close`.
  
- **Template sketch:**
  

```html
<div>
  <div class="wrm-separator wrm-modern" style="margin: 15px -15px 0px" />
  <div style="padding-top: 1em; text-align: center">
    <div class="wrm-dark-gray">Use a wallet on another device:</div>
    <img
      v-if="qrDataUrl"
      :src="qrDataUrl"
      alt="QR code for using a wallet on another device"
      style="width: 156px; height: 156px; margin: 0.5em auto" />
    <div class="wrm-dark-gray" style="font-size: 14px">
      Already scanned? Click close to return to the website.
    </div>
    <div class="wrm-button-bar" style="margin: auto; padding-top: 0.5em">
      <button
        type="button"
        class="wrm-button"
        style="margin: auto"
        :disabled="loading"
        @click="close()">
        Close
      </button>
    </div>
  </div>
</div>
```

- **QR generation:** compute `qrDataUrl` in a `watchEffect` on the `interactionUrl` prop:
  

```js
import QRCode from 'qrcode';
// in setup():
const qrDataUrl = ref('');
watchEffect(async () => {
  try {
    qrDataUrl.value = await QRCode.toDataURL(props.interactionUrl, {
      errorCorrectionLevel: 'M',
      margin: 2,
      scale: 4
    });
  } catch(e) {
    console.error('Could not generate QR code:', e);
    qrDataUrl.value = '';
  }
});
```

- If generation fails, `qrDataUrl` stays empty and only the img is omitted — fail soft, never block the chooser.
  
- Error correction `M` (15%) — payload is a short-to-medium URL; `M` keeps the module count low enough to scan from a laptop screen.
  
- New-file copyright header: `Copyright (c) 2026 Digital Bazaar, Inc.` (verify with `date +%Y` at implementation time).
  
## 4. Wiring (mirrors `canWebShare` exactly)
`HintChooser.vue` — add prop `interactionUrl` (String, default `''`), render after the footer slot, emit `close` upward as the existing `cancel` event (Close uses the same dismissal path as cancel — the 5.2.1 `hide()` behavior comes for free):

```html
<template #hint-list-footer>
  <slot name="hint-list-footer" />
  <CrossDeviceOptions
    v-if="interactionUrl"
    :interaction-url="interactionUrl"
    :loading="loading"
    @close="cancel()" />
  ... existing web share block stays as-is below ...
</template>
```

`MediatorWizard.vue` — add pass-through prop `interactionUrl` (String, default `''`), bind it on `<HintChooser>`.

`ThirdPartyMediatorWizard.vue` — add `const interactionUrl = ref('');` set in the `ready` callback (`interactionUrl.value = mediator.getInteractionUrl();`), cleared in `hide` (`interactionUrl.value = '';`), bound on `<MediatorWizard>`.

`FirstPartyMediatorWizard.vue` — same three lines. The `FirstPartyMediator` receives `credential` / `credentialRequestOptions` via `CredentialEventProxy` before `ready()`, so the method works identically there.
## 5. Close semantics
`close` → `cancel`:

- Third-party context: `mediator.cancel()` → RP receives a `null` response (handled cleanly since v7.0.1's null-response fix).
  
- First-party popup: `FirstPartyMediator.cancel()` → `window.close()`; the third-party context observes the popup closing and resolves with no choice, same as the user closing the popup today.
  

No new cancel pathway is introduced; the button is a labeled shortcut to existing behavior. Coordinators are separately advised (polyfill docs, per the parent spec) to cancel the CHAPI request when their exchange progresses.
## 6. UX decisions taken for Phase 1 (revisitable)
- **QR always visible** when an interaction URL exists — no disclosure toggle in v1. The parent spec leaves inline-vs-disclosure to experimentation; inline is the simpler starting point and the feedback target.
  
- **Section order:** registered/JIT hints, then "Remember my choice" checkbox (3p), then cross-device section. The QR also renders when `hints.length === 0` — arguably its most valuable case (user has no wallet in this browser at all).
  
- **Copy** (draft, to bikeshed in PR review):
  
  - Heading: `Use a wallet on another device:`
    
  - Post-scan: `Already scanned? Click close to return to the website.`
    
  - Button: `Close`
    
## 7. Manual test plan
Use the local harness from the parent spec (local mediator at `https://authn.localhost:33443` + a `chapi-demo-*` repo with `MEDIATOR` repointed and a `protocols.interact` URL added to its CHAPI call).

| #   | Case | Expected |
| --- | --- | --- |
| 1   | Request with valid `protocols.interact` | QR renders below hints; scanning on a phone opens the interaction URL |
| 2   | Storage request with `credential.options.protocols.interact` | Same as 1 |
| 3   | `protocols` without `interact` | No cross-device section |
| 4   | No `protocols` (legacy RP) | Chooser pixel-identical to today |
| 5   | `interact` URL invalid / non-https / missing `iuv=1` | Section hidden, console warning |
| 6   | Zero registered hints + valid `interact` | Empty-hints message + QR section |
| 7   | Close button (3p context) | Dialog hides; RP promise resolves null |
| 8   | Close button (1p popup) | Popup closes; 3p context resolves, no stuck UI |
| 9   | `hide()` mid-flow | No UI remains (5.2.1 regression) |
| 10  | Permission request | No cross-device section |
| 11  | Browsers: Chrome, Firefox, Safari × 1p/3p | Dialog lays out, QR scannable, no scroll clipping |

Watch item for #11: the QR adds ~200px of dialog height; verify the popup/iframe heights still fit smaller laptop screens without clipping the Close button.
## 8. Suggested commit sequence
1. `Add qrcode dependency.` — package.json + lockfile.
  
2. `Add interaction URL getter to BaseMediator.` — getter only.
  
3. `Add cross-device QR section to wallet chooser.` — component + wiring + copy. `Addresses #166.`
  

Each step lints clean (`npm run lint`) and leaves the app functional.
## Resolved implementation decisions

1. **`iuv=1` is hard-required in the getter.** Rationale in §2: the
   parameter is definitional — it is how any consumer (including a
   scanning wallet) identifies a value as an interaction URL, so a
   `protocols.interact` value without it is malformed and rendering it
   would produce QR codes wallets cannot interpret. Warn and hide, never
   render.

2. **Component name stays `CrossDeviceOptions.vue`** (matches the parent
   spec; accommodates the Phase 2 link without a rename).

3. **QR size/scale constants are hardcoded in the component** for v1.
   Trade-offs considered:
   - *Hardcode in component* — pro: values live next to their only
     consumer, the component stays self-contained, and the chooser's
     existing footer blocks already use inline style values, so it
     matches local precedent. Con: magic numbers; a second consumer
     would mean duplication.
   - *Add to `web/mediator/constants.js`* — pro: one obvious place to
     tune during the planned UX experimentation, alongside
     `DEFAULT_HANDLER_POPUP_*`. Con: that file belongs to the mediator
     (non-UI) layer — pixel/scale values for a Vue component would blur
     the core-mediator/UI separation that the 4.10.0 refactor
     deliberately introduced, and it adds indirection for a single
     consumer.
   - Decision: hardcode now; promote to a shared constant only if a
     second consumer appears (e.g., Phase 2 rendering or popup height
     math in test case #11).
