var Yolo = require('../lib/Yolo.js');
var assert = require('assert');

describe('Digest', function () {

  var cyclic = { a: 42, b: {}, c: [12, 'b'] };
  cyclic.b.loop = cyclic;
  cyclic.c.push(cyclic.c);

  [ 'str'
  , { object: 42 }
  , ['list', 'of', 'data']
  , NaN
  , undefined
  , null
  , true
  , false
  , Object
  , function () {}
  , cyclic
  ].map(function (e) {
    it('should digest: ' + e, function () {
      Yolo.Digest(e);
    });
  });

});
