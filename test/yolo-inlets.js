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

  });

});
