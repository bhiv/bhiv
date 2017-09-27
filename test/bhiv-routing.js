require('pegjs-require');
var Bhiv = require('../lib/Bhiv.js');
var assert = require('assert');

describe('Bhiv', function () {

  describe('Routing', function () {

    var Root = new Bhiv.Node('Test', 'Root');
    var A = new Bhiv.Node('A', 'A');
    A.on('test-1').as('failure').end();
    var B = new Bhiv.Node('B', 'B');

    Root.attach(A);
    Root.attach(B);

    Root.require = new Bhiv.Loader(Root, function (opts, callback) {
      var grower = function () {
        return new Bhiv.Node(opts.fqn, opts.fqn.split('.').pop());
      };
      debugger;
      return callback(null, grower);
    }, {});

    it('When accessing uninstancied node when parent has node with same name', function (d) {
      B.begin().then('.A:test-1').end(42, function (err, res) {
        if (err) return d(err);
        try { assert.equal(res, 42); }
        catch (err) { return d(err); }
        return d();
      });
    });

  });

});