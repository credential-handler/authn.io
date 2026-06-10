# Spec: Cross-Device and Custom-Scheme Wallet Selection in the CHAPI Mediator

- **Status:** Draft

- **Repo:** `credential-handler/authn.io`

- **Author:** DJ Scruggs

- **Date:** 2026-06-10 (updated same day with decisions from the
  [#166 discussion](https://github.com/credential-handler/authn.io/issues/166))

- **Tracking issue:** [credential-handler/authn.io#166](https://github.com/credential-handler/authn.io/issues/166)

## Summary

Extend the CHAPI wallet chooser (rendered by authn.io, the credential
mediator) with new selection options alongside the existing list of
browser-registered credential handlers, delivered in two phases:

1. **Phase 1 — cross-device QR code:** when the relying party supplies an
   interaction URL (`protocols.interact`), render it as a QR code so the
   user can continue the exchange with a wallet on another device (e.g., a
   phone wallet scanning from a laptop screen).

2. **Phase 2 — same-device, unregistered wallet:** render the interaction
   URL as a `web+interaction://` custom-scheme link so a native or web
   wallet that has registered that scheme — but is not registered as a
   CHAPI credential handler in this browser — can receive the exchange.
   Phased separately because the scheme name still needs community
   agreement (see Open Questions).

## Terminology

The `protocols` map in a CHAPI request contains two different kinds of URL.
The distinction drives the whole design:

- **Interaction URL** — the value of `protocols.interact`, and only that
  value. It is served from the **coordinator's own website**, so its origin
  is one the end user recognizes. It is dereferenceable: fetching it with
  `?iuv=1` and `Accept: application/json` returns
  `{"protocols": {"vcapi": ..., "OID4VP": ...}}` — i.e., it is an
  indirection layer over the protocol URLs. A wallet that scans it can
  discover and pick whichever protocol it supports.

- **Protocol URLs** — the values of `protocols.OID4VP`, `protocols.vcapi`,
  etc. These are homed at **workflow services**, not the coordinator, and
  are intended for direct consumption by a chosen credential handler.

**Only the interaction URL is acceptable QR/link content.** Protocol URLs
are never rendered as QR codes or custom-scheme links: their origins are
meaningless to end users, and they target a single protocol rather than
letting the scanning wallet choose. This also means no protocol-preference
logic is needed — there is exactly one candidate URL.

## Motivation

Coordinator websites (relying parties orchestrating VC exchanges) that
want cross-device delivery currently build their own QR code UX outside of
CHAPI, then integrate it alongside the CHAPI chooser themselves. Every
coordinator duplicates this work and users get an inconsistent experience.

Since the mediator already receives the coordinator's `protocols` map in
the credential request, it can render the cross-device option itself, in
one place, with consistent UX for every site that calls CHAPI.
Coordinators that want more control can still render their own QR codes;
this feature simply removes that burden for the common case.

This also restores a "use a wallet outside this browser" escape hatch. The
previous mechanism (Web Share bridge to native apps) was removed in
authn.io 7.0.0.

## Background

- CHAPI (Credential Handler API) is a polyfill any website can call to
  show a credential handler ("wallet") selector. The selector UI is served
  from the neutral third-party origin authn.io (this repo).

- Since v5.1.0, relying parties may include
  `credentialRequestOptions.web.protocols` (request/presentation) or
  `credential.options.protocols` (storage): a map of protocol name → URL.
  The mediator already uses this map to match URL-based credential
  handlers and to forward matching protocol URLs to a chosen handler via a
  `request` query parameter (`web/mediator/BaseMediator.js`,
  `web/mediator/HintManager.js`).

- The chooser UI (`web/components/HintChooser.vue`) wraps `WrmHintChooser`
  from `vue-web-request-mediator` and exposes a `hint-list-footer` slot —
  the same slot previously used for the Web Share button.

## Goals

- Show a QR code of the coordinator's interaction URL
  (`protocols.interact`) in the wallet chooser when one is provided.

- Apply to both credential requests/presentations **and** credential
  storage (`credential.options.protocols`) — confirmed in the #166
  discussion.

- Provide a "Close" affordance for after the user has scanned the QR code
  (see UX), since the mediator cannot observe the cross-device exchange.

- Appear in both the third-party and first-party mediator flows.

- Degrade invisibly: requests with no `protocols.interact` (including all
  legacy CHAPI-only RPs) see the chooser exactly as today.

- (Phase 2) Show a `web+interaction://<interaction URL>` link under the
  same visibility condition.

## Non-Goals

- Defining or changing any exchange protocol. The QR encodes the
  interaction URL the coordinator supplied, verbatim — no new payload
  format.

- Registering or handling the `web+interaction://` scheme on the wallet
  side (that is wallet-implementation work, out of scope for this repo).

- Returning a credential response through the mediator for cross-device
  flows. Once a wallet picks up the interaction URL on another device, the
  exchange continues out-of-band between wallet and coordinator; the
  mediator's involvement ends.

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
|   Already scanned? Click      |
|   close to return to the      |
|   website.                    |
|   [Close]                     |
| Use a wallet on this device   |
| that isn't listed: (Phase 2)  |
|   [web+interaction:// link]   |
---------------------------------
```

**Dialog lifecycle after scan** (decided in #166 as an experiment): the
mediator cannot detect that a wallet on another device picked up the
exchange, so both of the following apply:

- Coordinators should cancel the CHAPI request once their exchange
  progresses (to be covered in coordinator guidance docs).
- The cross-device section includes a "Close" button under copy to the
  effect of *"Already scanned? Click close to return to the website."*

Final layout and copy, and whether the QR is shown inline or behind a
disclosure ("Show QR code") to reduce visual noise, are open — the #166
discussion calls for experimenting and gathering feedback.

## Data Flow

1. Coordinator calls CHAPI with `credentialRequestOptions.web.protocols`
   (request/presentation) or `credential.options.protocols` (storage),
   e.g.
   `{interact: 'https://coordinator.example/exchanges/123', OID4VP: ..., vcapi: ...}`.

2. The mediator (`ThirdPartyMediator` / `FirstPartyMediator`) already
   holds the request; a new accessor on `BaseMediator` exposes the
   interaction URL — `protocols.interact` only — reusing the existing
   extraction logic and the existing RP protocol URL validation in
   `HintManager.js`.

3. The mediator wizard passes the interaction URL down to the chooser; a
   new component renders:

   - the QR code (client-side encoding of the URL string), and

   - (Phase 2) an anchor with
     `href="web+interaction://" + <interaction URL>`.

4. No data leaves the browser. Encoding is purely client-side; nothing is
   sent to authn.io's server or any third party. Choosing the QR/link path
   bypasses the credential-handler selection entirely.

5. Out of band: the scanning wallet dereferences the interaction URL
   (`?iuv=1`, `Accept: application/json`), receives the protocol URL map,
   and continues the exchange directly with the workflow service. The
   mediator plays no part in this step.

## Implementation Sketch

- **New dependency:** the `qrcode` npm library for QR generation. Survey
  of existing usage (2026-06-10): the `credential-handler` GitHub org has
  no QR code usage today, so no org-level precedent exists; among Digital
  Bazaar repos, `bedrock-vue-wallet` (the closest analog — a Vue wallet
  UI) uses `qrcode` for generation (`html5-qrcode` there is for scanning
  only, not needed here), and `@digitalbazaar/vpqr` uses
  `@nuintun/qrcode` but is specific to CBOR-LD-compressed Verifiable
  Presentations, which does not apply. `qrcode` is small, well-maintained,
  and bundler-friendly (@bedrock/webpack).

- **New component:** `web/components/CrossDeviceOptions.vue` (name TBD)
  rendering the separator, QR code, post-scan copy, and "Close" button
  (and, in Phase 2, the custom-scheme link). Mounted via the existing
  `hint-list-footer` slot of `HintChooser.vue`, mirroring how the Web
  Share button was integrated.

- **Mediator changes:** expose the interaction URL
  (`protocols.interact`) from `BaseMediator` so both
  `ThirdPartyMediatorWizard.vue` and `FirstPartyMediatorWizard.vue` can
  pass it through. Reuse existing validation; never render a QR/link for a
  URL that fails it.

- **Visibility rule:** render nothing unless the request contains a valid
  `protocols.interact` URL. Other protocol entries (`OID4VP`, `vcapi`,
  ...) do not trigger the section.

- **Close behavior:** the "Close" button cancels/dismisses the mediator
  dialog through the same path as the existing cancel action (regression
  reference: the 5.2.1 `hide()` fix).

- **No server/API changes.** No storage changes (nothing is persisted; the
  feature is display-only and unaffected by partitioned-storage rules).

- **No DB schema changes** (this application has no database).

## Personal Information Impact (Privacy by Design)

- **Data touched:** the coordinator-supplied interaction URL and the RP
  origin (already displayed by the chooser today). No new personal data is
  collected, stored, transmitted, or retained by the mediator.

- **Purpose:** display-only re-encoding of data the coordinator already
  sent, so the user can move the exchange to a wallet of their choice.

- **Considerations:** interaction URLs may contain exchange identifiers
  that are capability-like (possession enables continuing the exchange).
  They appear on screen as a QR code, so shoulder-surfing/photographing
  the screen is the analog risk; this is inherent to all QR-based
  cross-device flows and mitigated by coordinators using short-lived,
  single-exchange URLs. The mediator never logs these URLs.

## Security Considerations

- **URL validation:** only render URLs that pass the existing RP protocol
  URL validation (https, well-formed). Never render `javascript:` or other
  schemes inside the QR/link.

- **Origin transparency:** interaction URLs are served from the
  coordinator's own origin (unlike protocol URLs, which are homed at
  workflow services). The chooser already shows the requesting origin; the
  cross-device section must remain visually tied to that origin context so
  users know whose request they are forwarding to their other device.
  Restricting QR content to `protocols.interact` preserves this property
  by construction.

- **Phishing surface:** a malicious RP can already present its own QR
  codes on its own page; rendering inside the mediator does not grant it
  new capability. The mediator must not lend extra legitimacy framing
  (e.g., wording should say the request comes from the named RP origin,
  not from authn.io).

- **No clickjacking regressions:** the new elements live inside the
  existing mediator dialog and inherit its protections.

## Testing

This repo has no automated test suite (CI runs ESLint only). Plan:

- `npm run lint` passes.

- Manual test matrix:

  - Request with `protocols.interact` → QR renders; scanning it with a
    phone wallet dereferences the interaction URL and continues the
    exchange; "Close" dismisses the dialog cleanly.

  - Storage request (`credential.options.protocols.interact`) → same
    behavior as above.

  - Request with protocol URLs but **no** `interact` entry → section
    hidden; chooser unchanged from today.

  - Request without `protocols` at all → chooser unchanged from today.

  - Invalid `interact` URL → section hidden, console warning (existing
    validation behavior).

  - Coordinator cancels the CHAPI request after its exchange progresses →
    dialog dismisses (no stuck UI).

  - Both first-party and third-party flows, across Chrome, Firefox,
    Safari (storage partitioning does not apply, but dialog rendering
    differs).

  - `hide()` called mid-flow → no UI remains (regression check for the
    5.2.1 fix).

  - (Phase 2) clicking the link on a machine with a `web+interaction://`
    handler launches it.

- Use vc-playground as the test coordinator since it already issues
  protocol-bearing requests.

## Resolved Decisions (from the #166 discussion)

1. **QR/link content:** only `protocols.interact` — the interaction URL —
   is acceptable. No protocol-preference logic.
2. **Dialog lifecycle:** experiment with coordinators canceling the CHAPI
   request on exchange progress, plus an "Already scanned?" Close button
   in the UI.
3. **Storage requests:** in scope — the section appears for storage as
   well as requests/presentations.
4. **Visibility:** no `protocols.interact` → UI unchanged.

## Open Questions

1. **`web+interaction://` scheme agreement:** the scheme name is not yet
   settled in the relevant CCG/VCALM work. Phase 2 ships either after
   agreement or experimentally to gather feedback — decision deferred
   until Phase 1 lands.

2. **QR always-visible vs. behind a disclosure** — to be settled by
   experimentation and user feedback.

3. **Coordinator guidance:** where do we document the "cancel the CHAPI
   request when your exchange progresses" recommendation for coordinator
   developers (README, CHAPI docs site, polyfill docs)?
