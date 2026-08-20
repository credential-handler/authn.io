/*!
 * authn.io development configuration.
 *
 * New BSD License (3-clause)
 * Copyright (c) 2015-2023, Digital Bazaar, Inc.
 * Copyright (c) 2015-2016, Accreditrust Technologies, LLC
 * All rights reserved.
 */
import {config} from '@bedrock/core';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import os from 'node:os';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// common paths
config.paths.cache = path.join(__dirname, '..', '.cache');
config.paths.log = path.join(os.tmpdir(), 'authn.localhost');

// bind to all interfaces so Docker containers can reach the host via
// host.docker.internal (which maps to 192.168.65.254, not loopback).
// note: this also exposes the mediator on all LAN interfaces, not just
// Docker's bridge — acceptable for local dev, avoid on shared networks.
config.server.bindAddr = ['0.0.0.0'];

/* Optional local overrides, loaded last so they win. `configs/local.js` is
gitignored, so machine-specific settings -- e.g. pointing `server.domain` at
a tunnel hostname so a phone can reach the mediator -- stay out of the
tracked config. */
const localConfigPath = path.join(__dirname, 'local.js');
if(existsSync(localConfigPath)) {
  await import(localConfigPath);
}
