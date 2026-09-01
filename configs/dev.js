/*!
 * authn.io development configuration.
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

// common paths
config.paths.cache = path.join(__dirname, '..', '.cache');
config.paths.log = path.join(os.tmpdir(), 'authn.localhost');

/* Bind to loopback only. This used to be `['0.0.0.0']`, so that a Docker
container could reach the host through `host.docker.internal` -- but that
also published the dev mediator on every interface the machine is attached
to, café and guest wifi included, for everyone rather than only the people
who needed the Docker path.

`configs/dev.js` is not what a container runs, so the exposure was paid by
everyone and used by few. Restore it in `configs/app.yaml` when you need it:

  server:
    bindAddr: ['0.0.0.0']

Set explicitly rather than left to the default. Bedrock computes `bindAddr`
from `server.domain`, so an override of `domain` would otherwise move it,
and a value that follows something else by accident is the harder kind to
debug. */
config.server.bindAddr = ['127.0.0.1'];

/* Point `@bedrock/config-yaml` at this directory, so `configs/app.yaml`
becomes the local override file.

`app.path` defaults to `/etc/bedrock-config`, which suits a deployment
rather than a working copy. It is an ordinary config value read when
config-yaml applies the app configuration, so development can move it. That
makes config-yaml the single override channel here instead of a rival to a
hand-rolled one: `configs/app.yaml` is gitignored, applies automatically
when present, and needs no flag to remember. See `configs/app.yaml.example`.

`BEDROCK_CONFIG` still takes precedence over the file when it is set, which
is how a deployment overrides everything here. */
config['config-yaml'].app.path = __dirname;
