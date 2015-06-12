/*
 * The module interface file for authorization.io.
 *
 * Copyright (c) 2015 The Open Payments Foundation. All rights reserved.
 */
var bedrock = require('bedrock');
var config = require('bedrock').config;
var views = require('bedrock-views');

require('bedrock-docs');
require('bedrock-express');
require('bedrock-mail');
require('bedrock-mongodb');
require('bedrock-protractor');
require('bedrock-requirejs');
require('bedrock-server');
require('./config');
require('./mappings');
require('./dids');
require('./puzzles');

// alias for bedrock error
var BedrockError = bedrock.util.BedrockError;
var logger = bedrock.loggers.get('app');

var api = {};
module.exports = api;

bedrock.events.on('bedrock-express.configure.routes', function(app) {
  app.get('/', function(req, res, next) {
    res.render('index.html');
  });

  /**
    This route handles redirecting a credential request
    to an idp in order to have credentials reviewed.
    A user logs in through this route and their callback is saved
    under a unique id stored in sessionStorage and the unique id
    along with the credentials being requested is then posted to
    the IDP associated with this user.
    Leads to 'idp.html' acceptCredentials function.

    @param callback
      url to post back to Credential Consumer
    @param credential
      credentials being requested from the credential consumer
  */
  app.post('/requests', function(req, res, next) {
    var jsonPostData = null;
    try {
      if(req.body.jsonPostData) {
        jsonPostData = JSON.parse(req.body.jsonPostData);
      }
    } catch(e) {
      return next(e);
    }

    // user is not logged in
    views.getDefaultViewVars(req, function(err, vars) {
      if(err) {
        return next(err);
      }
      if(req.query.credentialCallback) {
        vars.credentialRequest = jsonPostData;
      } else if(req.query.storageCallback) {
        vars.storageRequest = jsonPostData;
      }
      res.render('index.html', vars);
    });
  });

  /**
    Redirects approved credentials to the credential consumer associated
    with the user. Renders credentials-approve.html to do this.
    This route posts to the callback that was initially sent in to /credentials-request.

    @param id
      expects the id that maps to the credential consumer's callback in sessionStorage
    @param credential
      expects the credentials document from the IDP
  */
  app.post('/credentials', function(req, res, next) {
    var identity = JSON.parse(req.body.jsonPostData);
    views.getDefaultViewVars(req, function(err, vars) {
      if(err) {
        return next(err);
      }
      if(identity) {
        vars.authio = {};
        vars.authio.identity = identity;
      }
      res.render('index.html', vars);
    });
  });
});
