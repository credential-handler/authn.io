/*!
 * New BSD License (3-clause)
 * Copyright (c) 2017-2023, Digital Bazaar, Inc.
 * All rights reserved.
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
