require('pegjs-require');
var Yolo = require('../lib/Yolo.js');
var assert = require('assert');
var jmespath = require('jmespath');

var old_runtime_resolve = Yolo.VM.Runtime.prototype.resolve;
Yolo.VM.Runtime.prototype.resolve = function (str, data, callback) {
  switch (str.substr(0, str.indexOf(':'))) {
  case 'jp':
    try { data = jmespath.search(data, str.substr(3)); }
    catch (e) {
      console.warn(e);
      return callback(null, null);
    }
    return callback(null, data);
  default:
    return old_runtime_resolve(str, data, callback);
  }
};

var check = function (data, done) {
  return function (err, value) {
    try { assert.deepEqual(value, data); }
    catch (e) { return done(e); }
    return done(err);
  };
};

describe('Yolo', function () {

  describe('VM.AST', function () {

    var A = new Yolo.Node('A');

    it('test format', function (done) {
      A.on('test-format').format({ wrap: 'jp:@' }).end();
      A.emit('test-format', 42, check({ wrap: 42 }, done));
    });

    it('test then/format', function (done) {
      A.on('test-then-format').then(':test-format', 'jp:value').end();
      A.emit('test-then-format', { value: 42 }, check({ wrap: 42 }, done));
    });

  })

});