/*
 * The module interface file for a mock credential consumer.
 *
 * Copyright (c) 2015 The Open Payments Foundation. All rights reserved.
 */
var bedrock = require('bedrock');
var config = require('bedrock').config;
var views = require('bedrock-views');

bedrock.events.on('bedrock-express.configure.routes', function(app) {
  // mock credential callback page
  app.post('/consumer/credentials', function(req, res, next) {
    views.getDefaultViewVars(req, function(err, vars) {
      if(err) {
        return next(err);
      }

      try {
        if(req.body.jsonPostData) {
          var jsonPostData = JSON.parse(req.body.jsonPostData);
          if(jsonPostData) {
            vars.authio = {};
            vars.authio.identity = jsonPostData;
          }
        }
      } catch(e) {
        return next(e);
      }

      res.render('consumer/credentials.html', vars);
    });
  });

  // mock credential issuer page
  app.post('/consumer/issuer', function(req, res, next) {
    views.getDefaultViewVars(req, function(err, vars) {
      if(err) {
        return next(err);
      }

      res.render('index.html', vars);
    });
  });

});
