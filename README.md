# isomorphic-jsonp

Based on [jsonp-client](https://github.com/bermi/jsonp-client).
See basic description there.

## Key differences
* Removed "fs" dependency from serverside module, so it can be safely included in clientside build. And so removed ability to read files from filesystem (don't know whether it can be needed in real app. It seems it was introduced only for testing).
* Promises
* No multiple urls or array of urls (why it can be needed at all?)
* Removed hack for attaching `superagent-mock`.
* little sugar to allow to pass query parameters as object

## Installation

    $ npm install isomorphic-jsonp