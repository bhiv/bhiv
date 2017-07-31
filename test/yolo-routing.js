require('pegjs-require');
var Yolo = require('../lib/Yolo.js');
var assert = require('assert');

describe('Yolo', function () {

  describe('Routing', function () {

    var Root = new Yolo.Node('Test', 'Root');
    var A = new Yolo.Node('A', 'A');
    A.on('test-1').as('failure').end();
    var B = new Yolo.Node('B', 'B');

    Root.attach(A);
    Root.attach(B);

    Root.require = new Yolo.Loader(Root, function (opts, callback) {
      var grower = function () {
        return new Yolo.Node(opts.fqn, opts.fqn.split('.').pop());
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