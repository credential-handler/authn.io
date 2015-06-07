# authorization.io

A solution to the [NASCAR login problem][NASCAR].

This software enables a person to find their identity provider using an
email address and passphrase known to them.

In general, the site accomplishes this by providing a Web polyfill to
enable the decentralized lookup of services associated with a person,
organization, or entity. It does this by providing a number of REST APIs
that identity provider websites can integrate with as well as front-end
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
4. Map a decentralized identifier document to
   a credential vault / identity provider.
5. Proxy read and write requests for credentials between 
   credential issuers, credential consumers, and credential vaults /
   identity providers.

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

# REST API

# Design Notes

  * createdid

  * get (alternative to accept/send)
    * if no key, create key, browser asks:
    * idp signs key that we sent, up to browser to store it based on one-time vs permanent
    * one-time use key
      * different storage instead of localstorage, for more temporary use  sessionstorage maybe
      * generates key, mark it as one-time use. // how do we mark it as one-time?
      * sends request, including the public key to the idp
    * permanent key
      * generates key
        * places keys in temporary local storage area
          * after you click accept on idp
            * SEND REQUEST to callback
              * goes to authorization.io with signed public key,
                * takes temporary key and verifies it and sends it to webdht
                * permanent key gets stored in local storage
              * or delete key from local storage if not

  * What we need.
    * better threat analysis
    * messaging format for splitting up into multiple calls
    * handling edge cases (in library get up and logged into idp)
    * //sends request, including the public key to the idp

  * accept/send
    * idp calls to give off credentials

  * always sends signed credentials
    * and might send message with just key
      * browser can add it as a permanent key or drop it. based on one-use vs permanent.

  * Not needed?
    * return an error that the browser does not have a private key
    * needs to make call to generate key
    * createKey
    * returns back public key in an error object
    * idp signs public key with its private key
    * call accept again with the additional info, and browser adds to dht and fulfills the rest of the request

  * createKey (optional)
    * adds api call to create key,
    * gives back public key to be signed
    * passed to accept/send
# Demos
  * Registration  
    * head to /idp
    * Click create identity
    * Type a username and password, and click Submit.
  * Requesting a credential (Credential consumer) / Approving a requested credential (IDP)
    * head to /cc
    * click "Get Credential"
    * Login to an existing account on authorization.io
    * You will be redirected to /idp with the requested credentials and the id
    * Click Accept credentials
    * You will be redirected to authorization.io
    * Then to the credential consumer attached with the request with the approved credentials. 




[NASCAR]: https://indiewebcamp.com/NASCAR_problem "The NASCAR Problem"
[IC]: http://opencreds.org/specs/source/identity-credentials/ "Identity Credentials"
