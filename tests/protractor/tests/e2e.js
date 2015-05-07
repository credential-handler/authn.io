var bedrock = GLOBAL.bedrock;

describe('Registration', function() {
  var baseId = bedrock.randomString().toLowerCase();

  var identity = {};
  identity.email = baseId + '@loginhub.dev';
  identity.password = 'password';

  it('should register, map, and store a new DID', function() {
    bedrock.pages.idp.registerDid(identity);
  });
});
