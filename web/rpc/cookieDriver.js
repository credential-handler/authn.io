/*!
 * New BSD License (3-clause)
 * Copyright (c) 2018-2026 Digital Bazaar, Inc.
 */
import {get, getAll, remove, set} from 'tiny-cookie';

export default {
  _driver: 'cookieWrapper',
  _initStorage,
  iterate,
  getItem,
  setItem,
  removeItem,
  clear,
  length,
  key,
  keys,
  dropInstance
};

const COOKIE_OPTIONS = {secure: true, sameSite: 'None', expires: '10Y'};

async function _initStorage(options) {
  const dbInfo = {};
  if(options) {
    Object.assign(dbInfo, options);
  }
  dbInfo.keyPrefix = _getKeyPrefix(options, this._defaultConfig);
  // FIXME: support `serializer`?
  //dbInfo.serializer = serializer;
  this._dbInfo = dbInfo;
}

async function clear(callback) {
  try {
    await this.ready();
    _clear(this._dbInfo.keyPrefix);
  } catch(e) {
    if(callback) {
      return callback(e);
    }
    throw e;
  }
  if(callback) {
    callback();
  }
}

async function getItem(key, callback) {
  let result;
  key = _normalizeKey(key);

  try {
    await this.ready();
    result = get(this._dbInfo.keyPrefix + key);
    if(result) {
      // FIXME: support `dbInfo.serializer`?
      result = JSON.parse(result);
    }
  } catch(e) {
    if(callback) {
      return callback(e);
    }
    throw e;
  }
  if(callback) {
    callback(null, result);
  }
  return result;
}

async function iterate(iterator, callback) {
  try {
    await this.ready();

    const dbInfo = this._dbInfo;
    const {keyPrefix} = dbInfo;
    const keyPrefixLength = keyPrefix.length;
    const cookies = getAll();

    // not every cookie is counted as being "in storage", only those with a
    // matching key prefix, so a dedicated iterator var is used to pass the
    // proper count to `iterate()`
    let iterationNumber = 1;
    const names = Object.keys(cookies);
    for(const name of names) {
      if(!name.startsWith(keyPrefix)) {
        continue;
      }

      let result = cookies[name];
      if(result) {
        // FIXME: support `dbInfo.serializer`?
        result = JSON.parse(result);
      }
      result = iterator(
        result, name.substring(keyPrefixLength), iterationNumber++);
      if(result !== undefined) {
        return result;
      }
    }
  } catch(e) {
    if(callback) {
      return callback(e);
    }
    throw e;
  }
  if(callback) {
    callback();
  }
}

async function key(n, callback) {
  let result = null;
  try {
    await this.ready();
    const {keyPrefix} = this._dbInfo;
    const cookies = getAll();
    const names = Object.keys(cookies);
    let i = 0;
    for(const name of names) {
      if(!name.startsWith(keyPrefix)) {
        continue;
      }
      if(i === n) {
        result = name;
        if(result) {
          result = result.substring(keyPrefix);
        }
        break;
      }
      i++;
    }
  } catch(e) {
    if(callback) {
      return callback(e);
    }
    throw e;
  }
  if(callback) {
    callback(null, result);
  }
  return result;
}

async function keys(callback) {
  let keys;

  try {
    await this.ready();
    const {keyPrefix} = this._dbInfo;
    const keyPrefixLength = keyPrefix.length;
    const cookies = getAll();
    const names = Object.keys(cookies);
    keys = names
      .filter(k => k.startsWith(keyPrefix))
      .map(k => k.substring(keyPrefixLength));
  } catch(e) {
    if(callback) {
      return callback(e);
    }
    throw e;
  }
  if(callback) {
    callback(null, keys);
  }
  return keys;
}

async function length(callback) {
  let length;
  try {
    const keys = await this.keys();
    length = keys.length;
  } catch(e) {
    if(callback) {
      return callback(e);
    }
    throw e;
  }
  if(callback) {
    callback(null, length);
  }
  return length;
}

async function removeItem(key, callback) {
  key = _normalizeKey(key);

  try {
    await this.ready();
    remove(this._dbInfo.keyPrefix + key, COOKIE_OPTIONS);
  } catch(e) {
    if(callback) {
      return callback(e);
    }
    throw e;
  }
  if(callback) {
    callback();
  }
}

async function setItem(key, value, callback) {
  key = _normalizeKey(key);

  // convert undefined values to `null`
  if(value === undefined) {
    value = null;
  }
  // save original value to pass to callback
  const originalValue = value;

  try {
    await this.ready();
    // FIXME: support `dbInfo.serializer`?
    value = JSON.stringify(value);
    set(this._dbInfo.keyPrefix + key, value, COOKIE_OPTIONS);
  } catch(e) {
    if(callback) {
      return callback(e);
    }
    throw e;
  }
  if(callback) {
    callback(null, originalValue);
  }
  return originalValue;
}

async function dropInstance(options, callback) {
  if(typeof options === 'function') {
    callback = options;
    options = {};
  }

  options = Object.assign({}, options || {});
  if(!options.name) {
    const currentConfig = this.config();
    options.name = currentConfig.name;
    options.storeName = options.storeName || currentConfig.storeName;
  }

  try {
    if(!options.name) {
      throw new TypeError('"options.name" must be a string.');
    }
    let keyPrefix;
    if(!options.storeName) {
      keyPrefix = `_lf_${options.name}__`;
    } else {
      keyPrefix = _getKeyPrefix(options, this._defaultConfig);
    }

    _clear(keyPrefix);
  } catch(e) {
    if(callback) {
      return callback(e);
    }
    throw e;
  }
  if(callback) {
    callback();
  }
}

function _getKeyPrefix(options, defaultConfig) {
  let keyPrefix = options.name + '__';
  if(options.storeName !== defaultConfig.storeName) {
    keyPrefix += options.storeName + '__';
  }
  return '_lf_' + keyPrefix;
}

function _clear(keyPrefix) {
  const keys = Object.keys(getAll());
  for(const key of keys) {
    if(key.startsWith(keyPrefix)) {
      remove(key, COOKIE_OPTIONS);
    }
  }
}

function _normalizeKey(key) {
  if(typeof key !== 'string') {
    console.warn(`${key} used as a key, but it is not a string.`);
    key = String(key);
  }
  return key;
}
