/**
 * =========================================================================
 * MANSTAT CLOUD ADAPTER: GAS BRIDGE POLYFILL (gas-bridge.js)
 * =========================================================================
 * Provides seamless 100% drop-in compatibility for google.script.run
 * Allows all existing client-side templates and scripts to run identically
 * in modern Web browsers and Mobile devices via standard HTTP REST API.
 * =========================================================================
 */
(function() {
  if (typeof window.google === 'undefined') window.google = {};
  if (typeof window.google.script === 'undefined') window.google.script = {};

  function executeApiCall(fnName, args, successHandler, failureHandler) {
    var payload = {
      action: fnName,
      args: args || []
    };

    fetch('/api/' + fnName, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'ManStat-Bridge'
      },
      body: JSON.stringify(payload)
    })
    .then(function(response) {
      if (!response.ok) {
        return response.json().then(function(errData) {
          throw new Error(errData.message || ('Server error: ' + response.status));
        }).catch(function(e) {
          throw new Error(e.message || ('HTTP ' + response.status + ' ' + response.statusText));
        });
      }
      return response.json();
    })
    .then(function(data) {
      if (data && data.__gas_error) {
        if (failureHandler && typeof failureHandler === 'function') {
          failureHandler(new Error(data.message || 'System Error'));
        } else {
          console.error('[GAS Bridge Error]', data.message);
        }
      } else {
        if (successHandler && typeof successHandler === 'function') {
          successHandler(data);
        }
      }
    })
    .catch(function(err) {
      console.error('[GAS Bridge Network Error]', fnName, err);
      if (failureHandler && typeof failureHandler === 'function') {
        failureHandler(err);
      }
    });
  }

  function createProxyRunner(successHandler, failureHandler) {
    return new Proxy({}, {
      get: function(target, propKey) {
        if (propKey === 'withSuccessHandler') {
          return function(newSuccess) {
            return createProxyRunner(newSuccess, failureHandler);
          };
        }
        if (propKey === 'withFailureHandler') {
          return function(newFailure) {
            return createProxyRunner(successHandler, newFailure);
          };
        }
        if (propKey === 'withUserObject') {
          return function() {
            return createProxyRunner(successHandler, failureHandler);
          };
        }
        return function() {
          var args = Array.prototype.slice.call(arguments);
          executeApiCall(propKey, args, successHandler, failureHandler);
        };
      }
    });
  }

  window.google.script.run = createProxyRunner(null, null);

  // Mock google.script.url
  window.google.script.url = {
    getLocation: function(callback) {
      if (typeof callback === 'function') {
        callback({
          hash: window.location.hash,
          parameter: {},
          parameters: {}
        });
      }
    }
  };

  // Mock google.script.host
  window.google.script.host = {
    close: function() { window.close(); },
    setHeight: function(h) {},
    setWidth: function(w) {},
    editor: { focus: function() {} }
  };

  console.log('[ManStat Cloud Adapter] Google Apps Script Bridge Active (Proxy Mode)');
})();
