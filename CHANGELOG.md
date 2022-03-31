# authn.io ChangeLog

## 3.0.0 - 2022-03-xx

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
