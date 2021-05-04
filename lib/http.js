/*!
 * New BSD License (3-clause)
 * Copyright (c) 2018-2021, Digital Bazaar, Inc.
 * All rights reserved.
 */
const bedrock = require('bedrock');
require('bedrock-express');
require('bedrock-views');

require('./config');

const api = {};
module.exports = api;

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
    /* Note: This cookie is only used by Safari. It must be set here by the
    server with these attributes. It cannot be set in JavaScript or it
    will get a forced 7-day expiration by Safari. It must be accessible to
    JavaScript (not http-only) in order for storage access to work properly. */
    // set cookie to enable cross-domain storage access on Safari
    res.cookie('v', '1', {secure: true, sameSite: 'None'});
    // render main page
    res.render('main.html');
  });
});
