# authorization.io

A solution to the [NASCAR login problem][NASCAR].

A live version and demo of this site can be found at [authorization.io][].

This software enables a person to find their credential curator (previously
known as their identity provider) using an email address and passphrase known
to them.

In general, the site accomplishes this by providing a Web polyfill to
enable the decentralized lookup of services associated with a person,
organization, or entity. It does this by providing a number of HTTP APIs
that credential curator websites can integrate with as well as front-end
code that can be used as a polyfill on websites that want to support
[Identity Credentials][IC]-based login.

The goal of this project is to support [Identity Credentials][IC]-based
login until a more complete Web Decentralized Hashtable (WebDHT) solution
is standardized at W3C and Web browsers build the capability into the
core of a browser. While the WebDHT work is a multi-year R&D effort, this
software is provided as a placeholder so that other work that depends
on [Identity Credentials][IC] can proceed in parallel.

# Core Functionality

This software enables a person to:

1. Create and store a device-specific cryptographic key in local storage.
2. Create a decentralized identifier (DID), associate that DID with the
   public key associated in the previous step, and store it in a
   decentralized identifier document in a decentralized network.
3. Map an email address / passphrase combination to a decentralized
   identifier document.
4. Map a decentralized identifier document to a credential curator.
5. Proxy read and write requests for credentials between
   credential issuers, credential consumers, and credential curators.

# Development

The following section explains how to setup and develop the authorization.io
software on a local development machine.

### Requirements

* node.js
* npm
* mongodb

### Configuration

The options in the `./configs/authorization.dev.js` file can be tuned to your
environment as needed.

## Setup

* Setup an admin user on mongodb (see below)
* Install the dependencies (see below)
* Map the `authorization.dev` hostname to your localhost.

To setup an admin user on mongodb:

    Enter the mongo shell
    use admin
    db.addUser( { user: "admin", pwd: "password", roles: [ "clusterAdmin", "readWriteAnyDatabase", "userAdminAnyDatabase", "dbAdminAnyDatabase"] } )

To install dependencies, do the following:

    npm install
    nodejs authorization.dev.js compile-less

### Running

Add a host alias (for example, edit `/etc/hosts`) to map `authorization.dev` to
`localhost`.

Run the following to start up a development server from the source directory:

    node authorization.dev.js

To add more verbose debugging, use the `--log-level` option:

    node authorization.dev.js --log-level debug

### Usage

Access the server at the following URL:

* https://authorization.dev:33443/

[authorization.io]: https://authorization.io
[NASCAR]: https://indiewebcamp.com/NASCAR_problem "The NASCAR Problem"
[IC]: http://opencreds.org/specs/source/identity-credentials/ "Identity Credentials"
