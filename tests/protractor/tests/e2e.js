var bedrock = GLOBAL.bedrock;

describe('registration', function() {
  var baseId = bedrock.randomString().toLowerCase();
  var threeCharacters = 'abc';
  var oneHundredSixtyCharacters =
    'yA2NdBthMcnTqGYz3Eqe9uNHxM8u00TaooiuhIM' +
    'P45C2nfqXTN17c1QubT0szamTrfACOBOvNs5m67' +
    'yA2NdBthMcnTqGYz3Eqe9uNHxM8u00TaooiuhIM' +
    'P45C2nfqXTN17c1QubT0szamTrfACOBOvNs5m67';
  var identity = {};
  identity.email = baseId + '@example.com';
  identity.passphrase = 'ThisIsALongPassphrase23';

  describe('test identity registration form', function() {

    beforeEach(function(){
      bedrock.pages.idp.navigateToRegistrationForm()
    });

    it('should contain the proper form elements', function() {
      bedrock.pages.idp.checkFields();
    });

    it('should warn on empty email', function() {
      bedrock.pages.idp.testField('model.username', '', 'required');
    });

    it('should warn on short email', function() {
      bedrock.pages.idp.testField(
        'model.username', threeCharacters, 'minlength');
    });

    it('should warn on long email', function() {
      bedrock.pages.idp.testField(
        'model.username', oneHundredSixtyCharacters, 'maxlength');
    });

    it('should warn on empty passphrase', function() {
      bedrock.pages.idp.testField('model.passphrase', '', 'required');
    });

    it('should warn on short passphrase', function() {
      bedrock.pages.idp.testField(
        'model.passphrase', threeCharacters, 'minlength');
    });

    it('should warn on long passphrase', function() {
      bedrock.pages.idp.testField(
        'model.passphrase', oneHundredSixtyCharacters, 'maxlength');
    });

    it('should warn if passphrase and confirmation do not match', function() {
      bedrock.pages.idp.testFieldsMatch(
        'model.passphrase', 'model.passphraseConfirmation', 'goodPhraseA',
        'nonMatchingPhraseB', 'inputMatch');
    });

    it('should create a mapping and DID document', function() {
      // Override default timeout, RSA key generation is slow on older CPUs.
      this.timeout(180000);
      bedrock.pages.idp.registerDid(identity);
    });

  });

});
