/*!
 * New BSD License (3-clause)
 * Copyright (c) 2017-2026 Digital Bazaar, Inc.
 */
import * as contentType from 'content-type';
import {httpClient} from '@digitalbazaar/http-client';

let cacheStorage;

const CACHE_NAME = 'authn.io-1';
const CACHE_TTL = 5 * 60 * 1000;

export async function getWebAppManifest({origin, timeout = 1000}) {
  // require web app manifest to be loaded within timeout
  return Promise.race([
    new Promise(r => setTimeout(() => r(null), timeout)),
    _getWebAppManifest({origin})
  ]);
}

export function getWebAppManifestIcon({manifest, origin, size, theme}) {
  // no manifest / no icons to get
  if(!(manifest && Array.isArray(manifest.icons))) {
    return null;
  }

  if(!theme) {
    if(typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)')) {
      theme = 'dark';
    } else {
      theme = 'light';
    }
  }

  // find largest square icon that is at least 48px wide
  let best = null;
  for(const icon of manifest.icons) {
    try {
      if(!icon?.theme_color) {
        // icon has no theme and we already have a theme-matching icon
        if(best?.theme_color === theme) {
          continue;
        }
      } else if(icon?.theme_color !== theme) {
        // icon has a theme that does not match, skip it
        continue;
      }
      const {sizes, src} = icon ?? {};
      if(typeof sizes === 'string' && typeof src === 'string') {
        let [x, y] = sizes.split('x');
        x = parseInt(x, 10);
        y = parseInt(y, 10);
        if(x !== y) {
          // skip non-square icons
          // TODO: allow rectangular icons in some cases?
          continue;
        }
        if(x === size && y === size) {
          // ideal match found
          best = {x, y, src};
          break;
        }
        const delta = Math.abs(size - x);
        // current icon is best if:
        // 1. no icon chosen yet, OR
        // 2. best icon is smaller than `size` and current is not, OR
        // 3. current icon is closer to `size` than best icon so far
        if(!best || (best.x < 48 && x >= 48) || delta < best.delta) {
          best = {x, y, src, delta};
        }
      }
    } catch {
      // ignore errors in processing faulty manifest icon info
    }
  }

  if(best && origin) {
    // convert relative `src` URL to absolute
    if(!best.src.startsWith('http')) {
      let src = origin;
      if(!best.src.startsWith('/')) {
        src += '/';
      }
      best.src = src + best.src;
    }
  }
  return best;
}

async function _getWebAppManifest({origin}) {
  // urls are in order of priority
  const urls = [
    `${origin}/manifest.json`,
    `${origin}/manifest.webmanifest`
  ];
  const responses = await Promise.allSettled(urls.map(_fetchWithCache));
  const response = responses.find(({value}) => value !== null);
  return response?.value || null;
}

async function _parseBody(response) {
  if(!response.ok) {
    throw new Error(
      `Response: ${response.status} ${response.statusText}`);
  }
  if(!_isContentJson(response)) {
    throw new Error('Content is not JSON.');
  }
  return response.json();
}

function _isContentJson(response) {
  const {type} = contentType.parse(response.headers.get('content-type'));
  return ['application/manifest+json', 'application/json'].includes(type);
}

async function _legacyFetch(url) {
  const response = await httpClient.get(url, {credentials: 'omit'});
  if(!_isContentJson(response)) {
    throw new Error('Content is not JSON.');
  }
  return response.data;
}

async function _fetchWithCache(url) {
  try {
    if(!cacheStorage && typeof caches !== 'undefined') {
      try {
        cacheStorage = await caches.open(CACHE_NAME);
      } catch(e) {
        console.warn('Cache storage for web app manifest unavailable.', e);
      }
    }
    if(!cacheStorage) {
      // no cache storage/API available, fetch directly
      return await _legacyFetch(url);
    }

    // try to get cached response
    let response = await cacheStorage.match(url);
    if(response) {
      const expires = new Date(response.headers.get('expires'));
      const now = new Date();
      if(expires >= now) {
        // return cached response
        return await _parseBody(response);
      }
      // remove expired response from cache
      await cacheStorage.delete(url);
    }

    let fetchError;
    try {
      // fetch live response
      response = await fetch(url, {credentials: 'omit'});

      // build a cached response that will expire based on local config
      const headers = new Headers(response.headers);
      const expires = new Date(Date.now() + CACHE_TTL);
      headers.set('expires', expires.toUTCString());
      response = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
      });
    } catch(e) {
      fetchError = e;

      // failed to fetch, cache as not found
      const expires = new Date(Date.now() + CACHE_TTL);
      const headers = new Headers();
      headers.set('expires', expires.toUTCString());
      response = new Response(null, {
        status: 404,
        statusText: 'Not Found',
        headers
      });
    }

    // cache response, including a failed fetch; the cache is short-lived
    // and an intermittent failure will eventually be remedied
    try {
      await cacheStorage.put(url, response);
    } catch(e) {
      if(e.name !== 'QuotaExceededError') {
        throw e;
      }
      // cache has filled, clear the whole cache
      caches.delete(CACHE_NAME);
      cacheStorage = null;
      // use fetched response
      return await _parseBody(response);
    }

    // if there was a fetch error, throw it now
    if(fetchError) {
      throw fetchError;
    }

    // get cloned response from cache and return parsed body
    response = await cacheStorage.match(url);
    return await _parseBody(response);
  } catch(e) {
    console.warn(
      `Warning: Could not fetch the Web app manifest from "${url}". ` +
      `Fixing this may improve the information displayed for "${origin}".`, e);
    return null;
  }
}
