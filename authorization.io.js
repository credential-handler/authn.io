/*!
 * authorization.io production server.
 *
 * New BSD License (3-clause)
 * Copyright (c) 2015-2016, Digital Bazaar, Inc.
 * Copyright (c) 2015-2016, Accreditrust Technologies, LLC
 * All rights reserved.
 */
var bedrock = require('bedrock');
var config = require('bedrock').config;
var path = require('path');

require('./lib/index');
require('./configs/authorization.io');

bedrock.start();
