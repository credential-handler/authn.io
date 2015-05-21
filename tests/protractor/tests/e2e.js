var bedrock = GLOBAL.bedrock;

describe('registration', function() {
  var baseId = bedrock.randomString().toLowerCase();

  var identity = {};
  identity.email = baseId + '@authorization.dev';
  identity.password = 'password';

  it('should map and store a new DID', function() {
    bedrock.pages.idp.registerDid(identity);
  });
});
