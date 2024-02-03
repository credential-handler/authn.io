# authn.io ChangeLog

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
