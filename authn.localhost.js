/*!
 * authn.io localhost development server starter.
 *
 * New BSD License (3-clause)
 * Copyright (c) 2015-2023, Digital Bazaar, Inc.
 * Copyright (c) 2015-2016, Accreditrust Technologies, LLC
 * All rights reserved.
 */
import * as bedrock from '@bedrock/core';

import './lib/index.js';
import './configs/dev.js';

bedrock.start();
