# authn.io ChangeLog

## 7.4.2 - 2026-06-12

### Fixed
- Reduce hint chooser popup height.

## 7.4.1 - 2026-06-12

### Fixed
- Prevent horizontal scrolling in first party mediator content area.
- Reduce third party mediator permission popup dialog height.

## 7.4.0 - 2026-06-12

### Changed
- Put the cross-device QR code behind an expander in the wallet
  chooser. The always-visible prompt ("Don't see your wallet?") keeps
  the option discoverable while leaving the dialog compact — and
  giving the wallet list more room — until the user asks for the
  code. When no wallets are registered, the QR code is the primary
  option and shows immediately, with no expander.

### Fixed
- Lay the 1p dialog out as a fixed frame around the wallet hint list:
  the header, greeting, and cross-device QR section always stay on
  screen and only the wallet list scrolls. The Close button can no
  longer scroll away, the popup window never adds a second scrollbar,
  and the QR section stays visible as an affordance at any popup
  height.
- Keep the 1p dialog content panel exactly filling the popup, so the
  page background no longer shows through below or beside the panel
  (visible as black bands in dark mode).
- Fix the wallet hint list's custom scrollbar styling (an invalid
  `scrollbar-width` value, and Chromium 121+ ignoring
  `::-webkit-scrollbar*` rules when standard scrollbar properties are
  also set) so the list reliably shows a persistent scrollbar as the
  affordance that more wallets are available.

## 7.3.1 - 2026-06-12

### Fixed
- Keep the 1p dialog content panel filling the popup height so the page
  background no longer shows through below short content (visible as a
  black band in dark mode).

## 7.3.0 - 2026-06-12

### Changed
- Update dependencies:
  - `@bedrock/config-yaml@4.3.3`
  - `@bedrock/core@6.3.0`
  - `@bedrock/express@8.7.0`
  - `@bedrock/server@5.1.0`
  - `@bedrock/views@12.0.0`
  - `@bedrock/vue@5.1.0`
  - `@bedrock/web@3.1.0`
  - `@bedrock/web-fontawesome@2.1.0`
  - `@bedrock/webpack@11.6.1`
  - `@digitalbazaar/http-client@4.3.0`
  - `credential-mediator-polyfill@4.0.0`
  - `vue@3.5.38`
  - `vue-router@4.6.4`
  - `web-request-mediator@3.0.0`
  - `web-request-rpc@3.0.1`.

### Fixed
- Use node 24 in dockerfile.

## 7.2.0 - 2026-06-12

### Added
- Render the relying party's interaction URL (`protocols.interact`) as a
  QR code in the wallet chooser, with a post-scan "Close" button, so the
  user can continue the exchange with a wallet on another device. The
  section appears for credential requests and storage and only when a
  valid interaction URL is present.

### Fixed
- Fit the allow wallet popup buttons on browsers with tall popup window
  chrome (e.g. Firefox).
- Allow the first party dialog to scroll when its content is taller than
  the popup window.

## 7.1.1 - 2024-02-05

### Fixed
- Update dependencies in Github workflows.

## 7.1.0 - 2024-02-03

### Added
- Load web app manifests from both `manifest.json` and `manifest.webmanifest` files.

## 7.0.0 - 2023-11-27

### Changed
- **BREAKING**: Disable Web Share bridge to native apps in every browser.

## 6.0.0 - 2023-11-02

### Changed
- **BREAKING**: Always assume partitioned storage for every browser.

## 5.5.0 - 2023-08-15

### Changed
- Change "Remember my choice" default to `false`.

## 5.4.0 - 2023-08-15

### Changed
- Reword store credential modal text.

## 5.3.0 - 2023-08-08

### Changed
- Deploy on node 20.x.

## 5.2.1 - 2023-08-08

### Fixed
- Do not show any mediator UI when `hide()` is called.

## 5.2.0 - 2023-03-23

### Added
- Ensure `credential_handler.url` origin matches app manifest origin.

## 5.1.2 - 2023-03-13

### Fixed
- Fix popup blocking of dialog for credential handlers that receive
  requests via URL.

## 5.1.1 - 2023-03-12

### Fixed
- Handle case that Web app manifest for a registered hint cannot
  be retrieved by building `handlerInfo` from existing locally
  stored hint information.

## 5.1.0 - 2023-03-10

### Added
- Add support for registering credential handlers that specify
  that they wish to receive input via `url` instead of `event`.
  These handlers will receive any protocol URLs specified by
  relying parties using protocol names that match any of the
  accepted protocols announced by the credential handler's
  `manifest.json`. The RP request information, including the
  credential request origin and the matching protocol URLs
  will be sent via a `request` query parameter as stringified
  JSON to the credential handler URL.

## 5.0.4 - 2023-03-03

### Fixed
- Use `@bedrock/webpack@9.0.1` to get updated subdependencies.

## 5.0.3 - 2023-02-24

### Fixed
- Use `web-request-mediator@2.0.5` to resolve issues with browsers
  that cannot check permissions in a third party context due to
  lack of any storage capability (not even ephemeral storage).

## 5.0.2 - 2023-02-23

### Fixed
- Use node 16 in Dockerfile for deployment.

## 5.0.1 - 2023-02-22

### Fixed
- Fix first party dialog CSS.
- Use `vue-web-request-mediator@6.0.1`.

## 5.0.0 - 2023-02-22

### Changed
- **BREAKING**: Use Vue 3 to implement UI. UI functionality should be
  generally the same as the previous 4.10 version.

## 4.10.0 - 2023-02-22

### Changed
- Internal refactoring to separate core mediator code from Vue
  UI code.
- Use `web-request-mediator@2.0.3` and `credential-mediator-polyfill@3` to
  get latest fixes and better browser storage management.
- Use `vue-web-request-mediator@6` for Vue 3 implementation.
- Update github packaging actions.

## 4.9.3 - 2023-01-26

### Fixed
- Update 1p/3p platform detection based on the use of Google Chrome
  specifically. Previously feature detection could be used to check
  for the Storage Access API, but this no longer works because it
  is present in Google Chrome even when cookies are not partitioned.
- Fix popup resize bugs via `web-request-rpc@2.0.3`.

## 4.9.2 - 2022-11-17

### Fixed
- Use `web-request-rpc@2.0.2` to avoid chromium mouse event bug.

## 4.9.1 - 2022-11-09

### Fixed
- Use `web-request-rpc@2.0.1` to avoid chromium-based browsers focus bug.

## 4.9.0 - 2022-10-25

### Added
- Include `web` `credentialRequestOptions` in WebShare payload.

## 4.8.0 - 2022-08-17

### Changed
- Update links to repos and documentation.

## 4.7.0 - 2022-06-21

### Changed
- Use `credential-mediator-polyfill@2.2` to fix storage on browsers
  like Chromium on Debian with 3rd party storage manually disabled.

## 4.6.1 - 2022-06-15

### Fixed
- Allow web app manifest cache storage to fail gracefully instead
  of blocking loading web app manifests.

## 4.6.0 - 2022-06-15

### Changed
- Use cookie driver for brave browser storage.

## 4.5.0 - 2022-06-14

### Changed
- Use `Credential Offer` instead of `Credential Request` in web share.

## 4.4.0 - 2022-06-14

### Changed
- Further clarify in UX that web share button is a different choice
  from the other options in the list.

## 4.3.0 - 2022-06-14

### Changed
- Make web share button on similar footing to hint options to improve
  UX. A future change should integrate the native app choice as just
  another hint option in the list (visually).

## 4.2.0 - 2022-06-14

### Added
- Add web share text to improve UX.

## 4.1.0 - 2022-06-13

### Added
- Include title in native web share.

## 4.0.0 - 2022-06-13

### Changed
- **BREAKING**: Add 1p (first party) flows for non-chrome browsers to
  eliminate the use of partitioned storage.
- **BREAKING**: Require `credential_handler` section in `manifest.json`
  files served from credential handler (aka digital wallet) sites in
  order for permission to be granted to allow a site to provide a
  credential handler to a user.
- **BREAKING**: Deprecate hints and registrations via public APIs.

## 3.1.0 - 2022-04-xx

### Added
- Add button to share requests with native apps if Web
  Share is available on the client platform.

## 3.0.2 - 2022-04-01

### Fixed
- Fix serving of main html view and update related deps:
  - `bedrock-views@8.1`
  - `bedrock-webpack@4.2`.

## 3.0.1 - 2022-03-31

### Fixed
- Add missing `bedrock-config-yaml` dependency.

## 3.0.0 - 2022-03-31

### Added
- Add Dockerfile and packaging workflow.

### Changed
- **BREAKING**: Modify application's default configuration.

## 2.0.0 - 2022-03-19

### Changed
- **BREAKING**: Change timeout for loading web app manifests to
  be 1 second. Fallbacks for display are used if it takes any site
  longer than a second to serve their web app manifest.
- Improve UI responsiveness when web app manifests can't be quickly
  by decreasing the timeout to 1 second and showing the UI with
  loading spinners if it takes more than 1 frame for any cached
  hints / data to be loaded.

## 1.0.0 - 2022-01-18

### Notes
- Initial tagged release after being in production for a long time.

### Added
- Add core files.

- See git history for changes previous to this release.
