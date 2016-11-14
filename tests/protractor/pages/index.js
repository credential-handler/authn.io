/*!
 * New BSD License (3-clause)
 * Copyright (c) 2015-2016, Digital Bazaar, Inc.
 * Copyright (c) 2015-2016, Accreditrust Technologies, LLC
 * All rights reserved.
 */
var pages = GLOBAL.bedrock.pages || {};

pages.idp = require('./idp');
pages.issuer = require('./issuer');
pages.authio = require('./authio');
pages.consumer = require('./consumer');

module.exports = GLOBAL.bedrock.pages = pages;
