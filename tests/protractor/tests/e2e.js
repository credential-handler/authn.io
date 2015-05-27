var bedrock = GLOBAL.bedrock;

describe('registration', function() {
  var baseId = bedrock.randomString().toLowerCase();

  var identity = {};
  identity.email = baseId + '@authorization.dev';
  identity.passphrase = 'ThisIsALongPassphrase23';

  it('should create a mapping and DID document', function() {
    // Override default timeout, RSA key generation is slow on older CPUs.
    this.timeout(120000);    
    bedrock.pages.idp.registerDid(identity);
  });
});
