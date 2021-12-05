/*!
 * New BSD License (3-clause)
 * Copyright (c) 2015-2021, Digital Bazaar, Inc.
 * All rights reserved.
 */
console.log('authn.io service worker 2');

self.addEventListener('notificationclick', async event => {
  /*if(!event.request.url.includes('/complete')) {
    return;
  }*/
  try {
    event.waitUntil(_handleComplete(event));
  } catch(e) {
    console.error(e);
  }
});

async function _handleComplete(event) {
  try {
    // FIXME: change to get URL from notification click event instead of
    // fetch event
    const {pathname} = new URL(event.request.url);
    if(!pathname.startsWith('/complete')) {
      return;
    }
    console.log('url', event.request.url);
    console.log('path', pathname);
    const clients = await self.clients.matchAll({type: 'window'});
    console.log('preventing default');
    event.preventDefault();
    console.log('client count', clients.length);
    //if(clients.length === 1) {
    //clients[0].navigate(event.request.url);
    //clients[0].focus();
    //}
  } catch(e) {
    console.error(e);
  }
}
