# Spec: Cross-Device and Custom-Scheme Wallet Selection in the CHAPI Mediator
- **Status:** Draft
  
- **Repo:** `credential-handler/authn.io`
  
- **Author:** DJ Scruggs
  
- **Date:** 2026-06-10
  
- **Tracking issue:** [credential-handler/authn.io#166](https://github.com/credential-handler/authn.io/issues/166)
  
## Summary
Extend the CHAPI wallet chooser (rendered by authn.io, the credential mediator) with two new selection options alongside the existing list of browser-registered credential handlers:

1. **Cross-device:** render the relying party's interaction URL as a QR code so the user can continue the exchange with a wallet on another device (e.g., a phone wallet scanning from a laptop screen).
  
2. **Same-device, unregistered wallet:** render the interaction URL as a `web+interaction://` custom-scheme link so a native or web wallet that has registered that scheme — but is not registered as a CHAPI credential handler in this browser — can receive the exchange.
  
## Motivation
Coordinator websites (relying parties orchestrating VC exchanges) that want cross-device delivery currently build their own QR code UX outside of CHAPI, then integrate it alongside the CHAPI chooser themselves. Every coordinator duplicates this work and users get an inconsistent experience.

Since the mediator already receives the RP's protocol interaction URLs in the credential request, it can render the cross-device and custom-scheme options itself, in one place, with consistent UX for every site that calls CHAPI. Coordinators that want more control can still render their own QR codes; this feature simply removes that burden for the common case.

This also restores a "use a wallet outside this browser" escape hatch. The previous mechanism (Web Share bridge to native apps) was removed in authn.io 7.0.0.
## Background
- CHAPI (Credential Handler API) is a polyfill any website can call to show a credential handler ("wallet") selector. The selector UI is served from the neutral third-party origin authn.io (this repo).
  
- Since v5.1.0, relying parties may include `credentialRequestOptions.web.protocols` (or `credential.options.protocols` for storage): a map of protocol name → interaction URL. The mediator already uses this map to match URL-based credential handlers and to forward matching protocol URLs to a chosen handler via a `request` query parameter (`web/mediator/BaseMediator.js`, `web/mediator/HintManager.js`).
  
- The chooser UI (`web/components/HintChooser.vue`) wraps `WrmHintChooser` from `vue-web-request-mediator` and exposes a `hint-list-footer` slot — the same slot previously used for the Web Share button.
  
## Goals
- Show a QR code of the RP's interaction URL in the wallet chooser when the RP provides one.
  
- Show a `web+interaction://<interaction URL>` link in the chooser under the same condition.
  
- Appear in both the third-party and first-party mediator flows.
  
- Degrade invisibly: requests with no `protocols` (all legacy CHAPI-only RPs) see the chooser exactly as today.
  
## Non-Goals
- Defining or changing any exchange protocol. The QR encodes the interaction URL the RP supplied, verbatim — no new payload format.
  
- Registering or handling the `web+interaction://` scheme on the wallet side (that is wallet-implementation work, out of scope for this repo).
  
- Returning a credential response through the mediator for cross-device flows. Once a wallet picks up the interaction URL on another device, the exchange continues out-of-band between wallet and RP; the mediator's involvement ends (see Open Questions re: dismissing the dialog).
  
- Redesigning the overall chooser UX.
  
## UX Sketch (non-prescriptive)
```
---------------------------------
| Choose a wallet:              |
|   [wallet A]                  |
|   [wallet B]                  |
| ----------------------------- |
| Use a wallet on another       |
| device:                       |
|   [QR code]                   |
| Use a wallet on this device   |
| that isn't listed:            |
|   [web+interaction:// link]   |
---------------------------------
```

Final layout, copy, and whether the QR is shown inline or behind a disclosure ("Show QR code") to reduce visual noise are design decisions to settle during review.
## Data Flow
1. RP calls CHAPI with `credentialRequestOptions.web.protocols` (request/presentation) or `credential.options.protocols` (storage), e.g. `{OID4VP: 'https://rp.example/exchanges/123', vcapi: '...'}`.
  
2. The mediator (`ThirdPartyMediator` / `FirstPartyMediator`) already holds the request; a new accessor on `BaseMediator` exposes the RP protocol map (reusing the existing extraction logic and the existing RP protocol URL validation in `HintManager.js`).
  
3. The mediator wizard passes the selected interaction URL down to the chooser; a new component renders:
  
  - the QR code (client-side encoding of the URL string), and
    
  - an anchor with `href="web+interaction://" + <interaction URL>`.
    
4. No data leaves the browser. Encoding is purely client-side; nothing is sent to authn.io's server or any third party. Choosing the QR/link path bypasses the credential-handler selection entirely.
  
## Implementation Sketch
- **New dependency:** the `qrcode` npm library for QR generation. Survey of
  existing usage (2026-06-10): the `credential-handler` GitHub org has no QR
  code usage today, so no org-level precedent exists; among Digital Bazaar
  repos, `bedrock-vue-wallet` (the closest analog — a Vue wallet UI) uses
  `qrcode` for generation (`html5-qrcode` there is for scanning only, not
  needed here), and `@digitalbazaar/vpqr` uses `@nuintun/qrcode` but is
  specific to CBOR-LD-compressed Verifiable Presentations, which does not
  apply. `qrcode` is small, well-maintained, and bundler-friendly
  (@bedrock/webpack).
  
- **New component:** `web/components/CrossDeviceOptions.vue` (name TBD) rendering the separator, QR code, and custom-scheme link. Mounted via the existing `hint-list-footer` slot of `HintChooser.vue`, mirroring how the Web Share button was integrated.
  
- **Mediator changes:** expose the RP protocol map / chosen interaction URL from `BaseMediator` so both `ThirdPartyMediatorWizard.vue` and `FirstPartyMediatorWizard.vue` can pass it through. Reuse existing validation; never render a QR/link for a URL that fails it.
  
- **Visibility rule:** render nothing unless the request contains at least one valid protocol interaction URL.
  
- **No server/API changes.** No storage changes (nothing is persisted; the feature is display-only and unaffected by partitioned-storage rules).
  
- **No DB schema changes** (this application has no database).
  
## Personal Information Impact (Privacy by Design)
- **Data touched:** the RP-supplied interaction URL and the RP origin (already displayed by the chooser today). No new personal data is collected, stored, transmitted, or retained by the mediator.
  
- **Purpose:** display-only re-encoding of data the RP already sent, so the user can move the exchange to a wallet of their choice.
  
- **Considerations:** interaction URLs may contain exchange identifiers that are capability-like (possession enables continuing the exchange). They appear on screen as a QR code, so shoulder-surfing/photographing the screen is the analog risk; this is inherent to all QR-based cross-device flows and mitigated by RPs using short-lived, single-exchange URLs. The mediator never logs these URLs.
  
## Security Considerations
- **URL validation:** only render URLs that pass the existing RP protocol URL validation (https, well-formed). Never render `javascript:` or other schemes inside the QR/link.
  
- **Origin transparency:** the chooser already shows the requesting origin; the cross-device section must remain visually tied to that origin context so users know whose request they are forwarding to their other device.
  
- **Phishing surface:** a malicious RP can already present its own QR codes on its own page; rendering inside the mediator does not grant it new capability. The mediator must not lend extra legitimacy framing (e.g., wording should say the request comes from the named RP origin, not from authn.io).
  
- **No clickjacking regressions:** the new elements live inside the existing mediator dialog and inherit its protections.
  
## Testing
This repo has no automated test suite (CI runs ESLint only). Plan:

- `npm run lint` passes.
  
- Manual test matrix:
  
  - RP request with `protocols` → QR + link render; scanning the QR with a phone wallet continues the exchange; clicking the link on a machine with a `web+interaction://` handler launches it.
    
  - RP request without `protocols` → chooser unchanged from today.
    
  - Invalid protocol URL → section hidden, console warning (existing behavior).
    
  - Both first-party and third-party flows, across Chrome, Firefox, Safari (storage partitioning does not apply, but dialog rendering differs).
    
  - `hide()` called mid-flow → no UI remains (regression check for the 5.2.1 fix).
    
- Use vc-playground as the test coordinator since it already issues protocol-bearing requests.
  
## Open Questions
1. **Multiple protocols:** when the RP supplies several interaction URLs, which one feeds the QR/link? Options: (a) RP marks one as preferred, (b) mediator picks by a fixed protocol preference order, (c) user picks. Simplest viable: define a preference order constant; revisit if real RPs send multiples.
  
2. **Dialog lifecycle after scan:** the mediator cannot detect that a wallet on another device picked up the exchange. Does the user manually close the dialog, or should the RP cancel the CHAPI request when its exchange progresses? Affects coordinator guidance docs.
  
3. `web+interaction://` **scheme status:** is this scheme already agreed in the relevant CCG/VCALM work, or does its name/registration need to be settled first? The link half of the feature depends on wallets adopting the same scheme.
  
4. **QR always-visible vs. behind a disclosure** — pure UX call.
  
5. **Storage requests:** should the cross-device section appear for credential _storage_ (`credential.options.protocols`) as well as requests, or requests only for v1?
