/*!
 * New BSD License (3-clause)
 * Copyright (c) 2022-2023, Digital Bazaar, Inc.
 * All rights reserved.
 */
const PROXY_EVENT_TIMEOUT = 60000;

export class CredentialEventProxy {
  constructor() {
    this.receivePromise = null;
  }

  createServiceDescription() {
    let serviceDescription;
    // this promise resolves once the event is received
    this.receivePromise = new Promise((resolveReceive, rejectReceive) => {
      const timeoutId = setTimeout(() => {
        rejectReceive(new Error('Timed out waiting to receive event.'));
      }, PROXY_EVENT_TIMEOUT);

      serviceDescription = {
        credentialEventProxy: {
          // called by credential handler to send event to UI window
          async send(event) {
            // event received, clear timeout
            resolveReceive(event);
            clearTimeout(timeoutId);

            // this promise resolves when the promise that the UI passes
            // to `event.respondWith` resolves
            return new Promise((resolveSend, rejectSend) => {
              event.respondWith = promise => {
                try {
                  resolveSend(promise);
                } catch(e) {
                  rejectSend(e);
                }
              };
            });
          }
        }
      };
    });

    return serviceDescription;
  }

  async receive() {
    return this.receivePromise;
  }
}
