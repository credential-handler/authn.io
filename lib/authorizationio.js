/*
 * The module interface file for authorization.io.
 *
 * Copyright (c) 2015 The Open Payments Foundation. All rights reserved.
 */
var bedrock = require('bedrock');
var config = require('bedrock').config;
var views = require('bedrock-views');

require('bedrock-mail');
require('bedrock-express');
require('bedrock-docs');
require('bedrock-server');
require('bedrock-mongodb');
require('bedrock-requirejs');
require('./config');
require('./mappings');
require('./dids');

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
  app.post('/credentials-request', function(req, res, next) {
    console.log('req.cookies', req.cookies, req.body);
    var request = null;
    try {
      if(req.body.jsonPostData) {
        request = JSON.parse(req.body.jsonPostData);
      }
    } catch(e) {
      return next(e);
    }

    // user is logged in
    if(req.cookies.session && request.credential) {
      var sessionData = JSON.parse(req.cookies.session);
      var url = '/idp-redirect?idp=' + sessionData.idp.url;
      request = JSON.parse(req.body.jsonPostData);
      if(request.callback) {
        url += '&callback=' + request.callback;
      }
      if(request.credential) {
        url += '&credential=' + request.credential.type;
      }
      return res.redirect(url);
    }

    // user is not logged in
    views.getDefaultViewVars(req, function(err, vars) {
      if(err) {
        return next(err);
      }
      if(request) {
        vars.credentialRequest = request;
      }
      res.render('index.html', vars);
    });
  });

  app.post('/create-identity', function(req, res, next) {
    views.getDefaultViewVars(req, function(err, vars) {
      if(err) {
        return next(err);
      }
      try {
        if(req.body.jsonPostData) {
          var request = JSON.parse(req.body.jsonPostData);
          if(request.registrationCallback) {
            vars.registrationCallback = request.registrationCallback;
          }
          if(request.idp) {
            vars.idp = request.idp;
          }
        }
      } catch(e) {
        // TODO: handle this better perhaps
        return next(e);
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
  app.post('/credentials-approve', function(req, res, next) {
    var request = JSON.parse(req.body.jsonPostData);
    views.getDefaultViewVars(req, function(err, vars) {
      if(err) {
        return next(err);
      }
      if(request && request.credentials) {
        vars.credentials = request.credentials;
      }
      res.render('index.html', vars);
    });
  });
});
