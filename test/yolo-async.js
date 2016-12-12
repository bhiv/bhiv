var Yolo = require('../lib/Yolo.js');
var assert = require('assert');

describe('Async', function () {

  describe('Each', function () {

    [ ['should responde', [], 0]
    , ['with 1 sync', [42], 42]
    , ['with 1 async', [42], 42, true]
    ].map(function ([name, array, response, async]) {
      var result = 0;
      it(name, function (cb) {
        Yolo.Async.each(array, function (e, cb) {
          result += e;
          if (async) {
            return setTimeout(cb, 1);
          } else {
            return cb();
          }
        }, function (err) {
          if (err) return cb(err);
          try { assert.equal(result, response); }
          catch (e) { return cb(e); }
          return cb();
        });
      });
    });

  });

});
