var Yolo = require('../lib/Yolo.js');
var assert = require('assert');

describe('Yolo', function () {

  describe('Fqn', function () {

    [ { fqn: 'Absolute.Path.To.A.Child', has: 'type', eq: 'root' }
    , { fqn: '.Relative.Path.To.A.Child', has: 'next.next.name', eq: 'To' }
    , { fqn: 'Child.With:inlet', has: 'next.next.next.name', eq: 'inlet' }
    , { fqn: ':inlet-without-path', has: 'type', eq: 'inlet' }
    , { fqn: 'Child.With[data . field]', has: 'next.next.next.path', eq: 'data.field', nostr: true }
    , { fqn: '[data.field.without.path]', has: 'type', eq: 'data' }
    , { fqn: '.Child.With.Model/and/field/and/subfield', has: 'next.next.next.type', eq: 'field' }
    , { fqn: '.Path.To.Model<.With/path.Paramerter>', has: 'next.next.args.0.next.type', eq: 'field' }
    , { fqn: '.Model<A,[with.data.parameter]>.And.SubChild', has: 'args.1.type', eq: 'data' }
    , { fqn: '.Model<With[mixed],[parameter]>', has: 'args.0.next.next.path', eq: 'mixed' }
    ].map(function (e) {
      it('should parse: ' + e.fqn, function () {
        var fqn = new Yolo.Fqn(e.fqn);
        var path = e.has.split('.');
        var ii = fqn;
        /*
        try {
        */
        for (var i = 0; i < path.length; i++)
          ii = ii[path[i]];
        assert.equal(ii, e.eq);
        /*
        } catch (f) {
          console.log(e.fqn, require('util').inspect(fqn, null, 10));
          process.exit();
        }
        */
        return ;
      });
      if (e.nostr != true) {
        it('sould serialize: ' + e.fqn, function () {
          assert.equal(new Yolo.Fqn(e.fqn).toString(), e.fqn);
        });
      }
    });

  })

});