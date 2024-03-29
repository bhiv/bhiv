require('pegjs-require');
var Bhiv = require('../lib/Bhiv.js');
var assert = require('assert');
var async = require('async');

describe('Bhiv', function () {

  describe('AutoLoading', function () {

    var cases = { SetImmediate: function (f) { setImmediate(f); }
                , ProcessNextTick: function (f) { process.nextTick(f); }
                , Pipe: function (f) { f(); }
                };

    Object.keys(cases).map(function (name) {
      return ;
      var c = cases[name];
      it('should return the same node (' + name + ')', function (done) {
        var r = [];
        var A = new Bhiv.Node('A');
        var Log = new Bhiv.Node('Log');
        A.attach(Log, 'Log');
        A.require = new Bhiv.Loader(A, function (option, callback) {
          r.push(new Error('stack'));
          return c(function () {
            var name = option.fqn.substr(1);
            return callback(null, function () { return new Bhiv.Node(name, name) });
          });
        });
        return async.parallel
        ( [ function (c) { A.send(name + ':test-1', { val: 42 }, async.ensureAsync(c)); }
          , function (c) { A.send(name + ':test-2', { val: 42 }, async.ensureAsync(c)); }
          , function (c) { A.send(name + ':test-3', { val: 42 }, async.ensureAsync(c)); }
          , function (c) { A.send(name + ':test-4', { val: 42 }, async.ensureAsync(c)); }
          ]
        , function (e) {
          if (r.length === 1) return done(e);
          return done(new Error('Object produced '+r.length+' times'));
        });
      });
    });

  });
});