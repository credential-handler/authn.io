var pages = GLOBAL.bedrock.pages || {};

pages.idp = require('./idp');
pages.authio = require('./authio');

module.exports = GLOBAL.bedrock.pages = pages;
