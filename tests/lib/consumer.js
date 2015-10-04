/*
 * The module interface file for a mock credential consumer.
 *
 * Copyright (c) 2015 The Open Payments Foundation. All rights reserved.
 */
var bedrock = require('bedrock');
var bodyParser = require('body-parser');
var views = require('bedrock-views');

bedrock.events.on('bedrock-express.configure.routes', function(app) {
  // parse application/x-www-form-urlencoded
  var parseForm = bodyParser.urlencoded({extended: false});

  // mock credential callback page
  app.post('/consumer/credentials', parseForm, function(req, res, next) {
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

      res.render('main.html', vars);
    });
  });
});
