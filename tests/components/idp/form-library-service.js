define([], function() {

'use strict';

/* @ngInject */
function factory(brFormLibraryService) {
  var service = {};

  service.CONTEXT = brFormLibraryService._CONTEXT;

  var vocab = {
    "@context": service.CONTEXT,
    "id": "urn:bedrock-angular-credential-library",
    "label": "bedrock-angular-credential Library",
    "@graph": [
      {
        "id": "email",
        "type": "Property",
        "label": "Email Address",
        "range": "String"
      },
      {
        "id": "streetAddress",
        "type": "Property",
        "label": "Street Address",
        "range": "String"
      },
      {
        "id": "addressLocality",
        "type": "Property",
        "label": "Locality",
        "range": "String"
      },
      {
        "id": "addressRegion",
        "type": "Property",
        "label": "Region",
        "range": "String"
      },
      {
        "id": "postalCode",
        "type": "Property",
        "label": "Postal Code",
        "range": "String"
      },
      {
        "id": "issued",
        "type": "Property",
        "label": "Date Issued",
        "range": "String"
      },
      {
        "id": "ageOver",
        "type": "Property",
        "label": "Age is Over",
        "range": "String"
      },
      {
        "id": "height",
        "type": "Property",
        "label": "Height",
        "range": "String"
      },
      {
        "id": "weight",
        "type": "Property",
        "label": "Weight",
        "range": "String"
      },
      {
        "id": "birthDate",
        "type": "Property",
        "label": "Date of Birth",
        "range": "Date"
      },
      {
        "id": "bloodType",
        "type": "Property",
        "label": "Blood Type",
        "range": "String"
      },
      {
        "id": "isSmoker",
        "type": "Property",
        "label": "Is a Smoker",
        "range": "String"
      },
      {
        "id": "claim",
        "type": "Property",
        "label": "Claim",
        "range": "URL",
        "collapsed": true
      },
      {
        "id": "address",
        "type": "Property",
        "label": "Address",
        "range": "URL"
      },
      {
        "id": "birthPlace",
        "type": "Property",
        "label": "Place of Birth",
        "range": "URL"
      },
      {
        "id": "VerifiedAddressCredential",
        "type": "PropertyGroup",
        "label": "Verified Address",
        "layout": [
          {
            "property": "claim",
            "propertyGroup": "PostalAddressPropertyGroup"
          }
        ]
      },
      {
        "id": "AgeOverCredential",
        "type": "PropertyGroup",
        "label": "Verified Age",
        "layout": [
          {
            "property": "claim",
            "propertyGroup": "AgeOverPropertyGroup"
          }
        ]
      },
      {
        "id": "PhysicalExaminationCredential",
        "type": "PropertyGroup",
        "label": "Physical Examination Results",
        "layout": [
          {
            "property": "claim",
            "propertyGroup": "PhysicalExaminationPropertyGroup"
          },
          {
            "property": "issued",
          }
        ]
      },
      {
        "id": "EmailCredential",
        "type": "PropertyGroup",
        "label": "Verified Email",
        "layout": [
          {
            "property": "claim",
            "propertyGroup": "EmailClaimPropertyGroup"
          },
          {
            "property": "issued"
          }
        ]
      },
      {
        "id": "BloodTestCredential",
        "type": "PropertyGroup",
        "label": "Blood Test Results",
        "layout": [
          {
            "property": "claim",
            "propertyGroup": "BloodTestPropertyGroup"
          },
          {
            "property": "issued"
          }
        ]
      },
      {
        "id": "BirthDateCredential",
        "type": "PropertyGroup",
        "label": "Birth Date Certification",
        "layout": [
          {
            "property": "claim",
            "propertyGroup": "BirthDatePropertyGroup"
          }
        ]
      },
      {
        "id": "BirthDatePropertyGroup",
        "type": "PropertyGroup",
        "label": "Birth Record",
        "layout": [
          {
            "property": "birthDate"
          },
          {
            "property": "birthPlace",
            "propertyGroup": "PostalAddressPropertyGroup"
          }
        ]
      },
      {
        "id": "EmailClaimPropertyGroup",
        "type": "PropertyGroup",
        "collapsed": true,
        "layout": [
          {
            "property": "email"
          }
        ]
      },
      {
        "id": "BloodTestPropertyGroup",
        "type": "PropertyGroup",
        "layout": [
          {
            "property": "bloodType"
          },
          {
            "property": "isSmoker"
          }
        ]
      },
      {
        "id": "AgeOverPropertyGroup",
        "type": "PropertyGroup",
        "layout": [
          {
            "property": "ageOver"
          }
        ]
      },
      {
        "id": "PhysicalExaminationPropertyGroup",
        "type": "PropertyGroup",
        "label": "Physical Examination",
        "layout": [
          {
            "property": "height"
          },
          {
            "property": "weight"
          }
        ]
      },
      {
        "id": "PostalAddressPropertyGroup",
        "type": "PropertyGroup",
        "layout": [
          {
            "property": "address",
            "propertyGroup": "AddressPropertyGroup"
          }
        ]
      },
      {
        "id": "AddressPropertyGroup",
        "type": "PropertyGroup",
        "layout": [
          {
            "property": "streetAddress"
          },
          {
            "property": "addressLocality"
          },
          {
            "property": "addressRegion"
          },
          {
            "property": "postalCode"
          }
        ]
      }
    ]
  };

  service.getLibrary = function() {
    var library = brFormLibraryService.create();
    return library.load(vocab.id, {vocab: vocab}).then(function() {
      return library;
    });
  };

  return service;
}

return {credFormLibraryService: factory};

});
