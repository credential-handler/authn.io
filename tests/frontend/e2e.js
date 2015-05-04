var bedrock = GLOBAL.bedrock;

describe('DID creation page', function() {
  it('should exist', function() {
    bedrock.waitForUrl('/');
  });
});
