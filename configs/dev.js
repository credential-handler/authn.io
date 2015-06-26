/*
 * authorization.io test configuration.
 *
 * Copyright (c) 2015 The Open Payments Foundation. All rights reserved.
 */
var config = require('bedrock').config;
var path = require('path');

config.views.paths.push(path.join(__dirname, '..', 'tests', 'views'));

// load the development-specific extensions to the site
require('../tests/lib/idp');
require('../tests/lib/issuer');
require('../tests/lib/consumer');
// pseudo bower package for idp and consumer
config.requirejs.bower.packages.push({
  path: path.join(__dirname, '..', 'tests', 'components'),
  manifest: {
    name: 'authiodev-components',
    moduleType: 'amd',
    main: './main.js',
    dependencies: {
      angular: '~1.3.0'
    }
  }
});

// bootstrap the Angular application so routes work
config.views.routes.push(['/idp', 'index.html']);
config.views.routes.push(['/issuer', 'issuer/credentials.html']);

// lower minimum wait time for proofs
config.authio.proofs.minWaitTimeInSecs = 2;
config.authio.proofs.maxWaitTimeInSecs = 3;
