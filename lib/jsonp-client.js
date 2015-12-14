// jsonp-client
// -----------------
// Copyright(c) 2013 Bermi Ferrer <bermi@bermilabs.com>
// MIT Licensed

(function (root) {
  'use strict';

  var
    // Save the previous value of the `jsonpClient` variable.
    previousJsonpClient = root.jsonpClient,
    is_browser = (typeof process !== 'undefined') ?
      // We are on a common js environment, we might be using browserify
      process.browser :
      (typeof window !== 'undefined'),
    getJsonpBrowser,
    getJsonp,
    CALLBACK_REGEXP = /[\?|&]callback=([a-z0-9_]+)/i,
    QUERYSTRING_REGEXP = /\?.+=.+/;

  var Promise = root.Promise || (typeof require === "function" && require('promise'));

  if (!Promise) {
    throw new Error('jsonp-client requires Promise for work');
  }

  // Create a safe reference to the jsonpClient object for use below.
  function jsonpClient(url, query) {
    if (!CALLBACK_REGEXP.test(url)) {
      if (!query) {
        query = {};
      }
      if (!query.callback) {
        query.callback = generateCallbackName();
      }
    }
    if (query) {
      url = addQuery(url, query);
    }
    return new Promise(function (resolve, reject) {
      getJsonp(url, function (err, response) {
        if (err) {
          return reject(err);
        } else {
          return resolve(response);
        }
      });
    });
  }

  function querystring(obj) {
    var res = [];
    for (var key in obj) {
      if (obj.hasOwnProperty(key)) {
        res.push(key + '=' + obj[key]);
      }
    }
    return res.join('&');
  }

  function addQuery(str, query) {
    var splitter = QUERYSTRING_REGEXP.test(str) ? '' : '?';
    return str + splitter + querystring(query);
  }

  function generateCallbackName() {
    return 'jsonpCallback_' + Math.random().toString().replace('.', '');
  }

  // Run jsonpClient in *noConflict* mode, returning the `jsonpClient`
  // variable to its previous owner. Returns a reference to
  // the jsonpClient object.
  jsonpClient.noConflict = function () {
    root.jsonpClient = previousJsonpClient;
    return jsonpClient;
  };

  // Browser only logic for including jsonp on the page
  getJsonpBrowser = function () {
    var getCallbackFromUrl,
      loadScript,
      head = document.getElementsByTagName('head')[0];

    loadScript = function (url, callback) {
      var script = document.createElement('script'),
        done = false;
      script.src = url;
      script.async = true;
      script.onload = script.onreadystatechange = function () {
        if (!done && (!this.readyState || this.readyState === 'loaded' || this.readyState === 'complete')) {
          done = true;
          script.onload = script.onreadystatechange = null;
          if (script && script.parentNode) {
            script.parentNode.removeChild(script);
          }
          callback();
        }
      };
      head.appendChild(script);
    };

    getCallbackFromUrl = function (url, callback) {
      var matches = url.match(CALLBACK_REGEXP);
      if (!matches) {
        return callback(new Error('Could not find callback on URL'));
      }
      callback(null, matches[1]);
    };

    return function (url, callback) {
      getCallbackFromUrl(url, function (err, callbackName) {
        var data,
          originalCallback = window[callbackName];
        if (err) {
          return callback(err);
        }
        window[callbackName] = function (jsonp_data) {
          data = jsonp_data;
        };
        loadScript(url, function (err) {
          if (!err && !data) {
            err = new Error('Calling to ' + callbackName + ' did not returned a JSON response. ' +
            'Make sure the callback ' + callbackName + ' exists and is properly formatted.');
          }

          if (originalCallback) {
            window[callbackName] = originalCallback;
          } else {
            // Repeated calls to the same jsonp callback should be avoided
            // Unique callback names should be used.
            // Also, the try, catch here is to support issues in IE8/IE7 where you can not use delete on window.
            try {
              delete window[callbackName];
            } catch (ex) {
              window[callbackName] = undefined;
            }
          }

          callback(err, data);
        });
      });
    };
  };

  getJsonp = is_browser ? getJsonpBrowser() : require('./jsonp-node.js');

  // Export the jsonpClient object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `jsonpClient` as a global object via a string identifier,
  // for Closure Compiler'advance' mode.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = jsonpClient;
  } else {
    // Set jsonpClient on the browser window
    root.jsonpClient = jsonpClient;
  }

  // Establish the root object, `window` in the browser, or `global` on the server.
}(global || window));
