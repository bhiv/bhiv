require('pegjs-require');
var Bhiv = require('../lib/Bhiv.js');
var assert = require('assert');

describe('Utils', function () {

  describe('Merge', function () {
    var array = [1];
    [ ['a', 42, 42]
    , [{ a: 2 }, { b: 1 }, { a: 2, b: 1 }]
    , [[1,2,3], [4,5,6], [1,2,3,4,5,6]]
    , [1, { a: 42 }, { a: 42 }]
    , [1, [24], [24]]
    , [[1], [1], [1, 1]]
    , [array, array, [1]]
    ].map(function (e) {
      const s = JSON.stringify.bind(JSON);
      it('should merge: ' + s(e[0]) + ' with ' + s(e[1]) + ' => ' + s(e[2]), function () {
        return assert.deepEqual(Bhiv.Util.merge(e[0], e[1]), e[2]);
      });
    });
  });

  describe('Serialize', function () {
    var cyc = {};
    cyc.cyclic = cyc;
    [ [ [], '[]' ]
    , [ {}, '{}' ]
    , [ ['a'], '["a"]' ]
    , [ ['b', 42, true, false, null], '["b",42,true,false,null]']
    , [ function () {}, '(function () {})' ]
    , [ { serialize: function () { return this.a; }, a: '42' }, '42' ]
    , [ cyc, '{"cyclic":Circular()}' ]
    ].map(function (e) {
      it('should serialize correcty: ' + e[1], function () {
        return assert.equal(Bhiv.Util.serialize(e[0]), e[1]);
      });
    });
  });

  describe('Compare', function () {
    [ [ 'null / undefined', undefined, null, 0 ]
    , [ 'bool', true, false, 1 ]
    , [ 'num 1', 0, 0, 0 ]
    , [ 'num 2', 1, 1, 0 ]
    , [ 'num 3', -1, 0, -1 ]
    , [ 'num 4', Infinity, 1000, 1 ]
    , [ 'num 5', NaN, NaN, 0 ]
    , [ 'date 1', new Date(), new Date('2017-03-15'), 1 ]
    , [ 'string 1', '', '', 0 ]
    , [ 'string 2', 'a', 'b', -1 ]
    , [ 'string 3', 'A', 'a', -1 ]
    , [ 'fn 1', function () {}, function () {}, 0 ]
    , [ 'fn 2', function (a) {}, function () {}, 1 ]
    , [ 'fn 3', function (a) {}, function (b) {}, -1 ]
    , [ '[] <> []', [], [], 0 ]
    , [ 'array 1', new Array(10), new Array(20), -1 ]
    , [ 'array 2', [1], [2], -1 ]
    , [ 'array 3', [5], [1, 2], -1 ]
    , [ '{} <> {}', {}, {}, 0 ]
    , [ 'obj 1', { a: 1 }, {}, 1 ]
    , [ 'obj 2', { a: 1 }, { a: 2 }, -1 ]
    ].map(function (e) {
      it('should compare correcty: ' + e[0], function () {
        return assert.equal(Bhiv.Util.compare(e[1], e[2]), e[3]);
      });
    });
  });

});
