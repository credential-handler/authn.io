# Login Hub

A solution to the [NASCAR login problem][NASCAR].

The site provides a Web polyfill to enable the decentralized lookup of
services associated with a person, organization, or entity. For example,
this software enables a person to find their identity provider using an
email address and passphrase known to them.

Development
-----------

The following section explains how to setup and develop the loginhub
software on a local development machine.

### Requirements

* node.js
* npm
* mongodb

### Configuration

The options in the `./configs/loginhub.dev.js` file can be tuned to your
environment as needed.

## Setup

* Setup an admin user on mongodb (see below)
* Install the dependencies (see below)
* Map the `loginhub.dev` hostname to your localhost.

To setup an admin user on mongodb:

    Enter the mongo shell
    use admin
    db.addUser( { user: "admin", pwd: "password", roles: [ "clusterAdmin", "readWriteAnyDatabase", "userAdminAnyDatabase", "dbAdminAnyDatabase"] } )

To install dependencies, do the following:

    npm install

### Running

Add a host alias (for example, edit `/etc/hosts`) to map `loginhub.dev` to
`localhost`.

Run the following to start up a development server from the source directory:

    node loginhub.dev.js

To add more verbose debugging, use the `--log-level` option:

    node loginhub.dev.js --log-level debug

### Usage

Access the server at the following URL:

* https://loginhub.dev:33443/

# REST API

# Design Notes

  * createdid

  * get (alternative to accept/send)
	  * if no key, create key, browser asks:
		* idp signs key that we sent, up to browser to store it based on one-time vs permanent
		* one-time use key
			* different storage instead of localstorage, for more temporary use	sessionstorage maybe
			* generates key, mark it as one-time use. // how do we mark it as one-time?
			* sends request, including the public key to the idp
		* permanent key
			* generates key
				* places keys in temporary local storage area
					* after you click accept on idp
						* SEND REQUEST to callback
						  * goes to loginhub with signed public key,
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

[NASCAR]: https://indiewebcamp.com/NASCAR_problem  "The NASCAR Problem"