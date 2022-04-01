/*!
 * New BSD License (3-clause)
 * Copyright (c) 2018-2022, Digital Bazaar, Inc.
 * All rights reserved.
 */
const bedrock = require('bedrock');
require('bedrock-express');
require('bedrock-views');
const path = require('path');

require('./config');

const api = {};
module.exports = api;

let mainHtmlFilePath;
bedrock.events.on('bedrock.init', () => {
  // store the location, in-memory, for the webpack generated index.html file
  mainHtmlFilePath = path.join(
    bedrock.config.views.bundle.paths.output.local, 'js', 'index.html');
});

// disable unnecessary cookie parsing and sessions
bedrock.events.on('bedrock-express.configure.cookieParser', () => false);
bedrock.events.on('bedrock-express.configure.session', () => false);

// override default views handling to remove CSRF cookies (there are no
// POSTs to authn.io and we don't need the cookie)
bedrock.events.on('bedrock-views.add', () => false);
bedrock.events.on('bedrock-express.start', async app => {
  // add "not found"/default handler now that all other routes are configured
  // eslint-disable-next-line no-unused-vars
  app.all('*', (req, res, next) => {
    if(!req.accepts('html')) {
      // use 404 if already set
      if(res.statusCode !== 404) {
        // send 406 Not Acceptable
        res.status(406);
      }
      // send with no content
      return res.send('');
    }
    // render main page
    res.sendFile(mainHtmlFilePath, bedrock.config.views.main.file.options);
  });
});
