/*!
 * authorization.io production server.
 *
 * New BSD License (3-clause)
 * Copyright (c) 2015-2016, Digital Bazaar, Inc.
 * Copyright (c) 2015-2016, Accreditrust Technologies, LLC
 * All rights reserved.
 */
const bedrock = require('bedrock');

require('./lib/index');
require('./configs/demo.authorization.io');

bedrock.start();
