var Yolo = require('../lib/Yolo.js');
var assert = require('assert');

Array.prototype.sum = function () {
  var res = 0;
  this.map(function (e) { res += e; });
  return res;
};

describe('Yolo', function () {

  describe('Inlet', function () {

    it('should return 42', function (done) {
      var A = new Yolo.Node('A');
      var B = new Yolo.Node('B');
      var C = new Yolo.Node('C');
      A.setOlder(B);
      B.setOlder(C);
      A.on('test1', 'prepare', function (e, c) { c(null, [1]) });
      C.on('test1', 'prepare', function (e, c) { c(null, [2]) });
      B.on('test1', function (e, c) { c(null, e.concat(4)); });
      C.on('test1', 'format', function (e, c) { c(null, e.concat(7)); });
      B.on('test1', 'format', function (e, c) { c(null, e.sum()); });
      A.on('test1', 'format', function (e, c) { c(null, e * 3); });
      A.send(':test1', [], function (err, result) {
        if (err) return done(err);
        try { assert.equal(result, 42); }
        catch (e) { return done(e); }
        return done();
      });
    });

    it('should return an error', function (done) {
      var A = new Yolo.Node('A');
      var B = new Yolo.Node('B');
      var C = new Yolo.Node('C');
      A.setOlder(B);
      B.setOlder(C);
      A.on('test2', 'prepare', function (e, c) { c(null, e) });
      B.on('test2', 'prepare', function (e, c) { c('this is an error'); });
      B.on('test2', function (e, c) { c('should never execute'); });
      C.on('test2', 'error', function (e, c) { c('should never execute'); });
      B.on('test2', 'error', function (e, c) { c(e || 'did not receive error'); });
      A.on('test2', 'format', function (e, c) { c('should never execute'); });
      A.send(':test2', 'some', function (err) {
        if (err != 'this is an error')
          return done('return an unexprected value: ' + JSON.stringify(arguments));
        return done();
      });
    });

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

    it('should process only prepare', function (done) {
      var A = new Yolo.Node('A');
      var B = new Yolo.Node('B');
      var C = new Yolo.Node('C');
      A.setOlder(B);
      B.setOlder(C);
      A.on('e', 'prepare', function (e, c) { c(null, e + 1) });
      B.on('e', 'prepare', function (e, c) { c(null, e * 5); });
      C.on('e', 'prepare', function (e, c) { c(null, e - 2); });
      A.on('e', 'execute', function (e, c) { c('should never execute'); });
      B.on('e', 'execute', function (e, c) { c('should never execute'); });
      C.on('e', 'execute', function (e, c) { c('should never execute'); });
      A.on('e', 'format', function (e, c) { c('should never execute'); });
      B.on('e', 'format', function (e, c) { c('should never execute'); });
      C.on('e', 'format', function (e, c) { c('should never execute'); });
      A.send(':e~prepare', 1, function (err, result) {
        if (err) return done(err);
        try { assert.equal(result, 8); return done(); }
        catch (e) { return done(e); }
      });
    });


    it('should process only execute', function (done) {
      var A = new Yolo.Node('A');
      var B = new Yolo.Node('B');
      var C = new Yolo.Node('C');
      A.setOlder(B);
      B.setOlder(C);
      A.on('e', 'prepare', function (e, c) { c('should never execute'); });
      B.on('e', 'prepare', function (e, c) { c('should never execute'); });
      C.on('e', 'prepare', function (e, c) { c('should never execute'); });
      C.on('e', 'execute', function (e, c) { c(null, e * 7); });
      A.on('e', 'format', function (e, c) { c('should never execute'); });
      B.on('e', 'format', function (e, c) { c('should never execute'); });
      C.on('e', 'format', function (e, c) { c('should never execute'); });
      A.send(':e~execute', 6, function (err, result) {
        if (err) return done(err);
        try { assert.equal(result, 42); return done(); }
        catch (e) { return done(e); }
      });
    });


    it('should process only format', function (done) {
      var A = new Yolo.Node('A');
      var B = new Yolo.Node('B');
      var C = new Yolo.Node('C');
      A.setOlder(B);
      B.setOlder(C);
      A.on('e', 'prepare', function (e, c) { c('should never execute'); });
      B.on('e', 'prepare', function (e, c) { c('should never execute'); });
      C.on('e', 'prepare', function (e, c) { c('should never execute'); });
      A.on('e', 'execute', function (e, c) { c('should never execute'); });
      B.on('e', 'execute', function (e, c) { c('should never execute'); });
      C.on('e', 'execute', function (e, c) { c('should never execute'); });
      A.on('e', 'format', function (e, c) { c(null, e - 2); });
      B.on('e', 'format', function (e, c) { c(null, e * 5); });
      C.on('e', 'format', function (e, c) { c(null, e + 1) });
      A.send(':e~format', 1, function (err, result) {
        if (err) return done(err);
        try { assert.equal(result, 8); return done(); }
        catch (e) { return done(e); }
      });
    });

  });

});
