# authn.io

A part of the solution to the [NASCAR login problem][NASCAR].

A live version of this site and a link to a demo can be found at
[authn.io][].

## Background

A Credential Handler is an event handler for credential request and
credential storage events. The [Credential Handler API][] helps
solve the [Nascar Problem](https://indieweb.org/NASCAR_problem). The
[Credential Handler API][] enables websites to install Credential Handlers that
can respond when users visit other websites that request or store credentials.

For example, a user may visit a website that wants them to login using
OpenIdConnect, provide an OAuth Token, authenticate using a [DID][], or present
some [Verifiable Credentials][]. When these other websites use the [Credential
Handler API][], the user is shown an in-browser selection screen with visual
representations (e.g. icons and origin information) of only those
Credential Handlers that they have been previously installed by the user and
that are compatible with the website's request. Once the user makes a choice,
the appropriate Credential Handler is loaded and a credential event is sent
to it.

The Credential Handler receives the event via a
[Service Worker](https://w3c.github.io/ServiceWorker) or, if the
[Credential Handler Polyfill][] is used, a simple page with no UI elements is
loaded that uses the polyfill to receive and respond to the event.

The Credential Handler must respond to the event with a credential that
fulfills the request. If necessary, the Credential Handler may open a window
on its website's origin to allow the user to interact with its website prior
to responding. This UI can be styled and shaped according to the website
owner's brand using arbitrary JavaScript and HTML like any other webpage.

## Credential Mediator

This software plays the Credential Mediator role described in
[Credential Handler API][]. It "polyfills" this role by running client-side
code under a neutral third party origin. There is no "server" component to
this software, it merely provides browser code that must be run in an
independent third party origin to mimick the behavior that a behavior that
implements the [Credential Handler API][] would function.

## Requirements

* Node.js v16+
* npm v8+

## Development

The following section explains how to setup and develop the authn.io
software on a local development machine.

### Configuration

The options in the `./configs/dev.js` file can be tuned to your environment as
needed.

Prefer a local override to editing that file, since it is checked in. Copy the
example and edit the copy:

    cp configs/local.js.example configs/local.js

`configs/local.js` is imported last when it exists, so its settings win, and it
is gitignored. Delete it to go back to the defaults. The server reads it at
startup, so restart after changing it.

The example covers the case it exists for: serving the mediator under a tunnel
hostname so a phone can reach it, which needs `server.host` and
`server.baseUri` changed and cannot be done from a checked-in file.

### Setup

* Install the dependencies

    npm install

* Map the `authn.localhost` hostname to your localhost.  For example, edit
  `/etc/hosts` to map `authn.localhost` to `localhost`.

### Running

Run the following to start up a development server from the source directory:

    node authn.localhost.js

To add more verbose debugging, use the `--log-level` option:

    node authn.localhost.js --log-level debug

### Usage

Access the server at the following URL:

* https://authn.localhost:33443/

## Testing

The first party wallet chooser dialog has an automated visual/layout test
suite. It drives a dev-only harness route
(`/test/wallet-chooser?hints=N&qr=1`) that renders the dialog with fake state,
so the layout can be exercised across wallet counts (0, 1, 5, 15) and the
cross-device QR section without any CHAPI registration, wallets, or popups. The
harness route is excluded from production builds.

Install the browser engines once:

    npx playwright install chromium webkit firefox

Run the layout regression suite:

    npm run test:e2e

This asserts structural invariants — the expected wallets render, no horizontal
or window scrollbar appears, the header stays pinned while the list scrolls, and
the panel fills the popup — rather than comparing pixels. It starts the dev
server automatically and runs five projects: desktop Chromium, WebKit, and
Firefox at the 500px popup width, plus emulated **iPhone 15** and **Pixel 7**.
The phone projects matter because on a phone the popup is clamped to the screen
width and crosses the dialog's 430px "small screen" CSS breakpoint, exercising
layout branches the desktop width does not.

Run a single project with, e.g., `npm run test:e2e -- --project=iphone`. The
project names are `chromium`, `webkit`, `firefox`, `iphone`, and
`android-pixel`.

Generate a browsable screenshot gallery of every state (wallet count × theme ×
engine, collapsed and expanded), with an `index.html` contact sheet:

    npm run gallery

Output is written to `test/e2e/gallery/` (git-ignored).

> **Brave:** the Chromium engine covers Brave's rendering (Brave is Chromium
> plus "shields", which do not affect the dialog CSS). Brave's storage/shields
> behavior is a CHAPI plumbing concern, verified in the manual mobile pass, not
> by this layout suite. Real mobile/Safari-on-iOS is likewise a manual pass.

## Production

Full instructions for running this code in production are beyond the scope of
this documentation.

A *simplified* startup script and systemd service file are available that could
be used with appropriate modifications. Considerations must be made for
scalability, robustness, TLS, and other issues.

An issue for any production environment is that that code should be bundled
such that it can be served as efficient static files. After any code updates,
either the production startup script, or appropriate command line flags, should
be used to output the static files:

    node authn.io.js bundle

A fully static site is possible but see the cookie note in `lib/http.js`.

[authn.io]: https://authn.io
[NASCAR]: https://indiewebcamp.com/NASCAR_problem "The NASCAR Problem"
[DID]: https://www.w3.org/TR/did-core
[Verifiable Credentials]: https://www.w3.org/TR/vc-data-model
[Decentralized Identifiers (DIDs)]: https://www.w3.org/TR/did-core
[Credential Handler API]: https://w3c-ccg.github.io/credential-handler-api
[Credential Handler API Repo]: https://github.com/w3c-ccg/credential-handler-api
[Credential Handler Polyfill]: https://github.com/credential-handler/credential-handler-polyfill
