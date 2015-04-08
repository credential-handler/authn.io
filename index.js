var bedrock = require('bedrock');
var path = require("path");

require('bedrock-express');
require('bedrock-requirejs');
require('bedrock-server');
require('bedrock-views');

bedrock.config.views.paths.push(
  path.join(__dirname)
);

// add pseudo bower package
bedrock.config.requirejs.bower.packages.push({
  path: path.join(__dirname, 'loginhubfrontend'),
  manifest: {
    name: 'loginhubfrontend',
    moduleType: 'amd',
    main: './main.js',
    dependencies: {
      angular: '~1.3.0'
    }
  }
});


bedrock.start();