/*
 * The module interface file for a mock credential consumer.
 *
 * Copyright (c) 2015 The Open Payments Foundation. All rights reserved.
 */
var bedrock = require('bedrock');
var config = require('bedrock').config;
var views = require('bedrock-views');

bedrock.events.on('bedrock-express.configure.routes', function(app) {
  // mock credential consumer landing page
  app.post('/cc', function(req, res, next) {
    views.getDefaultViewVars(req, function(err, vars) {
      if(err) {
        return next(err);
      }
      res.render('index.html', vars);
    });
  });

});
