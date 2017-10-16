require('pegjs-require');
var Bhiv = require('../lib/Bhiv.js');
var assert = require('assert');

describe('Bhiv', function () {

  describe('Static Fqn', function () {

    [ { fqn: 'Absolute.Path.To.A.Child', has: '0.type', eq: 'root' }
    , { fqn: '.Relative.Path.To.A.Child', has: '2.name', eq: 'To' }
    , { fqn: 'Child.With:inlet', has: '3.name', eq: 'inlet' }
    , { fqn: ':inlet-without-path', has: '0.type', eq: 'inlet' }
    ].map(function (e) {
      it('should parse: ' + e.fqn, function () {
        var fqn = Bhiv.Fqn.parse(e.fqn);
        var path = e.has.split('.');
        var ii = fqn;
        /**/
        try {
        /**/
        for (var i = 0; i < path.length; i++)
          ii = ii[path[i]];
        assert.equal(ii, e.eq);
        /**/
        } catch (f) {
          throw f
          console.log(e.fqn, require('util').inspect(fqn, null, 10));
          process.exit();
        }
        /**/
        return ;
      });
      if (e.nostr != true) {
        it('should serialize: ' + e.fqn, function () {
          assert.equal(Bhiv.Fqn.stringify(Bhiv.Fqn.parse(e.fqn)), e.fqn);
        });
      }
    });

  });

  describe('Dynamic Fqn', function () {

    [ ['{fqn}', { fqn: 'pli.ure:t e s t' }, 'Pli.Ure:t-e-s-t']
    , ['{p}:toto', { p: 'test' }, 'Test:toto']
    , ['{p}.B:toto', { p: 'test' }, 'Test.B:toto']
    , ['A.{p}:toto', { p: 'test' }, 'A.Test:toto']
    , ['A.{p}.B:toto', { p: 'test' }, 'A.Test.B:toto']
    , ['A:{m}', { m: 'method' }, 'A:method']
    , ['A:-{m}', { m: 'method' }, 'A:-method']
    , ['A:toto-{m}', { m: 'method' }, 'A:toto-method']
    , ['A:{m}-titi', { m: 'method' }, 'A:method-titi']
    , ['A:toto-{m}-titi', { m: 'method' }, 'A:toto-method-titi']
    ].map(function (e) {
      it('Test ' + e[0], function () {
        const result = Bhiv.VM.Runtime._resolveDynamicFqn(e[0], e[1]);
        assert.equal(result, e[2]);
      });
    });

  });

});
