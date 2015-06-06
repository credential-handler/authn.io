/*
 * authorization.io production server.
 *
 * Copyright (c) 2015 The Open Payments Foundation. All rights reserved.
 */
var bedrock = require('bedrock');
var config = require('bedrock').config;
var path = require('path');

require('./lib/authorizationio');
require('./configs/authorization.io');

bedrock.start();
