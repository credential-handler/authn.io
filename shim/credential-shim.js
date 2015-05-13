(function(){
 // figure out global
var local;

if (typeof global !== 'undefined') {
  local = global;
} else if (typeof window !== 'undefined') {
  local = window;
} else {
  try {
    local = Function('return this')();
  } catch (e) {
    throw new Error('polyfill failed because global object is unavailable in this environment');
  }
}

if('credentials' in local) {
  return;
}

install(local);

function install(local) {
  function Credentials() { };
  Credentials.prototype.gpret = function(opts) {
    if(!opts.query) {
      throw new Error('Could not get credentials; no query provided.');
    }

    // TODO: Set this to the url of production version of loginhub
    var loginhubUrl = 'http://login-hub.com/';


    var queryUrl = loginhubUrl + '>credentials=true' +
      '&domain=' + encodeURIComponent(opts.domain) +
      '&callback=' + encodeURIComponent(opts.callback);
    var query = escapeHtml(JSON.stringify(opts.query));
    var form = document.createElement('form');
    form.setAttribute('method', 'post');
    form.setAttribute('action', queryUrl);
    form.innerHTML = 
      '<input type="hidden" name="query" value="' + query + '" />';
    form.submit();
  
    function escapeHtml(str) {
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }
  };

  local.credentials = new Credentials();
}
})();
