define([], function() {

'use strict';

/* @ngInject */
function factory(
  $location, $scope, aioIdentityService, aioProxyService, brAlertService) {
  var self = this;
  self.display = {};
  var query = $location.search();

  /**
   * Resumes the flow by proxying a message. This function is called
   * for a `get` operation after an identity is chosen and then again later
   * to confirm credential transmission. It is called for a `store` operation
   * after an identity is chosen.
   *
   * @param err an error if one occurred.
   */
  self.complete = function(err) {
    if(err) {
      return brAlertService.add('error', err);
    }
    aioProxyService.proxy(query);
  };

  // we're receiving parameters from the RP or sending them to the IdP
  if(query.route === 'params') {
    if(aioProxyService.needsParameters(query)) {
      // flow is just starting, get parameters from RP
      return aioProxyService.getParameters(query).then(function(params) {
        if(query.op === 'get') {
          // always show identity chooser for `get` requests
          self.display.identityChooser = true;
          $scope.$apply();
          return;
        }

        if(query.op === 'store') {
          // only show identity chooser if can't auto-authenticate as owner
          var owner = _getOwnerId(params);
          aioIdentityService.createSession(owner).then(function() {
            self.display.redirectOrigin = query.origin;
          }).catch(function(err) {
            self.did = owner;
            self.display.identityChooser = true;
          }).then(function() {
            $scope.$apply();
          });
        }
      });
    }

    // already have parameters, we're invisibly proxing them to the IdP
    return aioProxyService.proxy(query);
  }

  // we're receiving the result from the IdP or sending it to the RP

  if(aioProxyService.needsResult(query)) {
    // no result received from IdP yet, we're invisibly proxying it and
    // then we'll reload as the main application in the flow to do something
    // further with the result
    return aioProxyService.proxy(query);
  }

  // if this is a storage request, proxy the result w/o need to confirm
  if(query.op === 'store') {
    self.display.redirectOrigin = query.origin;
    return aioProxyService.proxy(query);
  }

  // display confirmation page before transmitting result
  self.display.confirm = true;

  function _getOwnerId(identity) {
    return identity.credential[0]['@graph'].claim.id;
  }
}

return {aioProxyController: factory};

});
