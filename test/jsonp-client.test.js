(function (root) {
  "use strict";

  var expect = root.expect || require('expect.js'),
    jsonpClient,
    isNode = (typeof window === 'undefined'),
    baseLocation = isNode ? "http://localhost:8020/" : "";

  if (isNode) {
    var fs = require('fs');
    var express = require('express');
    var server = express();
    server.get("/fixtures/:file", function(req, res) {
      var content = fs.readFileSync(__dirname + '/fixtures/' + req.params.file);
      res.setHeader("Contet-Type", "text/plain");
      res.status(200).end(content);
    });
    server.listen(8020, "localhost");
  }
  
  if (isNode) {
    root.jsonpClient = "original";
    jsonpClient = require('../');
  } else {
    jsonpClient = root.jsonpClient;
  }

  describe('jsonpClient', function () {
    before(function () {});

    describe('No conflict', function () {
      it('should restore original jsonpClient', function () {
        var b = jsonpClient.noConflict(),
          currentVersion = b.noConflict();
        expect(currentVersion).to.be(b);
        expect(root.jsonpClient).to.be("original");
      });
    });

    describe("When fetching jsonp from " + (isNode ? "Node.js" : "a browser"), function () {
      var expected_one = {"one": "First"};
      var expected_two = {"two": "Second"};
        
      it('should get a URL', function (done) {
        jsonpClient(baseLocation + 'fixtures/one.js?callback=one')
          .then(function (one) {
            expect(one).to.be.eql(expected_one);
            done();
          });
      });

      it('should accept query params as object', function (done) {
        jsonpClient(baseLocation + 'fixtures/two.js', { callback: 'two' })
          .then(function (res) {
            expect(res).to.be.eql(expected_two);
            done();
          });
      });


      describe("can't pass these tests in browser env", function () {
        // In browser all following tests fail. 
        // Because when error occurrs inside external script, or request http fails, 
        // it seems there is no way to catch and handle it.
        // That is, even if all assertions are completed, even if eveything is wrapped in promises and try-catch,
        // Mocha still FAILS with "Script error (:0)" message.
        it('should complain if no callback is found', function (done) {
          jsonpClient(baseLocation + 'fixtures/one.js?callback=invalid').catch(function (err) {
            expect(err).to.be.an(Error);
            expect(err.message).to.match(/does not match to one defined in request \("invalid"\)/);
            done();
          });
        });


        it("should autogenerate callback name if it is omitted", function (done) {
          jsonpClient(baseLocation + 'fixtures/one.js').catch(function (err) {
            expect(err).to.be.an(Error);
            expect(err.message).to.match(/does not match to one defined in request \("jsonpCallback_\d+"\)/);
            done();
          });
        });

        it('should fail when no file is found', function (done) {
          jsonpClient(baseLocation + 'error').catch(function (err) {
            expect(err).to.be.an(Error);
            done();
          });
        });

        it('should fail and not callback twice with the retrieved file cannot be parsed', function (done) {
          // If this test fails, you'll get either a timeout or "error is null".  It seems mocha has weird behavior
          // if you try to call done a second time and throwing an error gets caught elsewhere because
          // this bug is a result of try catches surrounding big blocks of code.  To fix this issue, searching for callbacks
          // that may be within try, catch blocks.

          jsonpClient(baseLocation + 'fixtures/invalid_syntax2.js').catch(function (err) {
            setTimeout(function () { // Timeout ensures the issue always occurs if present.
              expect(err).to.be.an(Error);
              done();
            }, 1000);
          });
        });
      });
    });

  });

}(this));