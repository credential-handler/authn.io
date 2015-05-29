/*
 * authorization.io development server starter.
 *
 * Copyright (c) 2015 The Open Payments Foundation. All rights reserved.
 */
var bedrock = require('bedrock');
var config = require('bedrock').config;
var path = require('path');

require('./lib/authorizationio');

config.views.paths.push(path.join(__dirname, 'tests/views'));

// load the development-specific extensions to the site
require('./tests/lib/idp');
require('./tests/lib/consumer');
// pseudo bower package for idp and consumer
config.requirejs.bower.packages.push({
  path: path.join(__dirname, 'tests/components'),
  manifest: {
    name: 'idp-components',
    moduleType: 'amd',
    main: './main.js',
    dependencies: {
      angular: '~1.3.0'
    }
  }
});

// configure for tests
bedrock.events.on('bedrock.test.configure', function() {
  require('bedrock-protractor');
  require('./configs/test');
});

bedrock.start();
