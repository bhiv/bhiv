require('pegjs-require');
var Bhiv = require('../lib/Bhiv.js');
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
      Bhiv.Digest(e);
    });
  });

});
