var Yolo = require('../lib/Yolo.js');
var assert = require('assert');

describe('Utils', function () {

  describe('Merge', function () {
    [ ['a', 42, 42]
    , [{ a: 2 }, { b: 1 }, { a: 2, b: 1 }]
    , [[1,2,3], [4,5,6], [1,2,3,4,5,6]]
    , [1, { a: 42 }, { a: 42 }]
    , [1, [24], [24]]
    ].map(function (e) {
      const s = JSON.stringify.bind(JSON);
      it('should merge: ' + s(e[0]) + ' with ' + s(e[1]) + ' => ' + s(e[2]), function () {
        return assert.deepEqual(Yolo.Util.merge(e[0], e[1]), e[2]);
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
        return assert.equal(Yolo.Util.serialize(e[0]), e[1]);
      });
    });


  });

});
