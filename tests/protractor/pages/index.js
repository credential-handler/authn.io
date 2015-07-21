var pages = GLOBAL.bedrock.pages || {};

pages.idp = require('./idp');
pages.issuer = require('./issuer');
pages.authio = require('./authio');
pages.consumer = require('./consumer');

module.exports = GLOBAL.bedrock.pages = pages;
