/*!
 * authn.io production configuration.
 *
 * New BSD License (3-clause)
 * Copyright (c) 2015-2023, Digital Bazaar, Inc.
 * Copyright (c) 2015-2016, Accreditrust Technologies, LLC
 * All rights reserved.
 */
import {config} from '@bedrock/core';
import {fileURLToPath} from 'node:url';
import os from 'node:os';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// core configuration
config.core.workers = 1;

// server info
config.server.port = 443;
config.server.httpPort = 80;
config.server.domain = 'authn.io';

// common paths
config.paths.cache = path.join(__dirname, '..', '.cache');
config.paths.log = path.join(os.tmpdir(), 'authn.io');
