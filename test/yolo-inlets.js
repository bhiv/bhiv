require('pegjs-require');
var Yolo = require('../lib/Yolo.js');
var assert = require('assert');

Array.prototype.sum = function () {
  var res = 0;
  this.map(function (e) { res += e; });
  return res;
};

describe('Yolo', function () {

  describe('Inlet', function () {

    (function () {
      var A = new Yolo.Node('A');
      A.on('test3', function (payload) { throw new Error('will be catched'); });
      A.on('test4', function (payload) { return 42; });

      it('should works with synchronous function (success)', function (done) {
        A.send(':test3', {}, function (err) {
          if (err) return done();
          else return done('An error was expected');
        });
      });

      it('should works with synchronous function (error)', function (done) {
        A.send(':test4', {}, function (err, res) {
          return done(res == 42 ? null : 'expected result was 42 got ' + res);
        });
      });

    })();

    [ [ null, 42, null ]
    , [ false, 42, false ]
    , [ true, 42, true ]
    , [ 0, 42, 0 ]
    , [ 1, 42, 1 ]
    , [ '', 42, '' ]
    , [ ' ', 42, ' ' ]
    , [ 'value', 42, 'value' ]
    , [ [1,2,3], 42, [1,2,3] ]
    ].map(function (test, index) {
      var t = 'test-' + index;
      it('should resolve ' + t + ' ' + Yolo.Util.serialize(test[0]), function (done) {
        var N = new Yolo.Node('N');
        N.on(t, test[0]);
        //debugger;
        N.send(':' + t, test[1], function (err, result) {
          if (err) return done(err);
          try { assert.deepEqual(result, test[2]); }
          catch (e) { return done(e); }
          return done();
        });
      });

    });


  });

});
