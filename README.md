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

- npm v5+
- node v8.9+

# Development

The following section explains how to setup and develop the authn.io
software on a local development machine.

### Requirements

* node.js
* npm

### Configuration

The options in the `./configs/authn.localhost.js` file can be tuned to your
environment as needed.

## Setup

* Install the dependencies (see below)
* Map the `authn.localhost` hostname to your localhost.

To install dependencies, do the following:

    npm install

### Running

Add a host alias (for example, edit `/etc/hosts`) to map `authn.localhost` to
`localhost`.

Run the following to start up a development server from the source directory:

    node authn.localhost.js

To add more verbose debugging, use the `--log-level` option:

    node authn.localhost.js --log-level debug

### Usage

Access the server at the following URL:

* https://authn.localhost:33443/

[authn.io]: https://authn.io
[NASCAR]: https://indiewebcamp.com/NASCAR_problem "The NASCAR Problem"
[DID]: https://w3c-ccg.github.io/did-spec
[Verifiable Credentials]: https://w3c.github.io/vc-data-model
[Decentralized Identifiers (DIDs)]: https://w3c-ccg.github.io/did-spec
[Credential Handler API]: https://w3c-ccg.github.io/credential-handler-api
[Credential Handler API Repo]: https://github.com/w3c-ccg/credential-handler-api
[Credential Handler API Demo]: https://github.com/digitalbazaar/credential-handler-demo
[Credential Handler Polyfill]: https://github.com/digitalbazaar/credential-handler-polyfill
