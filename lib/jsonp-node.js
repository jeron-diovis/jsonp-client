"use strict";

var request = require('superagent'),
  vm = require('vm'),
  parensRegex = /(^\(|\);?\s*$)/,
  functionRegex = /^[a-z\d_]*\(/i,
  functionNameRegex = /([\w\d_]*)\(/,
  evalJsonp,
  parseJsonp,
  evalOrParseJavascript,
  fetchRemoteJsonp,
  fetchUrl,
  fetchLocalJsonp,
  CALLBACK_REGEXP = /[\?|&]callback=([a-z0-9_]+)/i;

function getCallbackFromUrl(url) {
  var matches = url.match(CALLBACK_REGEXP);
  if (!matches) {
    throw new Error('Could not find callback on URL');
  }
  return matches[1];
}

// Lazy JSONp extraction by JSON.parsing the callback argument
parseJsonp = function (javascript, callback) {
  var err = null,
    jsonString, json;
  try {
    // chomp off anything that looks like a function name, remove parenthesis
    jsonString = javascript.replace(functionRegex, "").replace(parensRegex, "");
    json = JSON.parse(jsonString);
  } catch (error) {
    err = error;
  }
  callback(err, json);
};

// Creates a JavaScript VM in order to evaluate
// javascript from jsonp calls. This is expensive
// so make sure you cache the results
evalJsonp = function (javascript, callback_name, cb) {
  var context, jsonp_callback_name, code;
  javascript = (javascript || '') + '';

  context = vm.createContext({
    error: null,
    cbData: null
  });

  jsonp_callback_name = (javascript.match(functionNameRegex) || [null, false])[1];

  code = "function " + jsonp_callback_name + " (data) { cbData = data } " +
         ' try { ' + javascript + ' } catch(e) { error = e;} ';

  try {
    if (!jsonp_callback_name) {
      throw new Error('Could not discover jsonp callback name on "' + javascript + '"');
    }

    vm.runInContext(code, context);
  } catch (e) {
    cb(new Error(e));
  }

  if (context.error) { return cb(new Error(context.error)); }
  cb(null, context.cbData);
};

// Given a javascript buffer this method will attempt
// to parse it as a string or it will attempt to run it
// on a vm
evalOrParseJavascript = function (javascript, callback_name, callback) {
  javascript = javascript.toString();

  var jsonp_callback_name = (javascript.match(functionNameRegex) || [null, false])[1];
  if (jsonp_callback_name && callback_name !== jsonp_callback_name) {
    callback(new Error('Callback name in response ("' + jsonp_callback_name + '") does not match to one defined in request ("' + callback_name + '")'));
    return;
  }

  parseJsonp(javascript, function (err, json) {
    if (err) {
      return evalJsonp(javascript, callback_name, function (err, json) {
        callback(err, json);
      });
    }
    callback(err, json);
  });
};



// Fetches a URL and returns a buffer with the response
fetchUrl = function (url_to_fetch, callback) {
  request
    .get(url_to_fetch)
    .end(function (err, res) {
      if (!err && res && res.status && res.status >= 400) {
        err = new Error(
          'Could not fetch url ' +
          url_to_fetch +
          ', with status ' +
          ((res && res.status) || "unknown") +
          '. Got error: ' +
          (err && err.message) + '.'
        );
      }
      callback(err, (res && res.text) || "cb({})");
    });
};

// Fetches a jsonp response from a remote service
// Make sure you cache the responses as this process
// creates a JavaScript VM to safely evaluate the javascript
fetchRemoteJsonp = function (remote_url, callback) {
  fetchUrl(remote_url, function (err, body) {
    if (err) {
      return callback(err);
    }
    evalOrParseJavascript(body, getCallbackFromUrl(remote_url), callback);
  });
};


module.exports = fetchRemoteJsonp;
