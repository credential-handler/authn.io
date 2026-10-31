/*!
 * New BSD License (3-clause)
 * Copyright (c) 2018-2026 Digital Bazaar, Inc.
 */
import cookieDriver from './cookieDriver.js';
import localforage from 'localforage';

localforage.defineDriver(cookieDriver);

export {localforage};
