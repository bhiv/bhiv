var Yolo = require('../lib/Yolo.js');
var assert = require('assert');

describe('Yolo', function () {

  describe('Fqn', function () {

    [ { fqn: 'Absolute.Path.To.A.Child', has: '0.type', eq: 'root' }
    , { fqn: '.Relative.Path.To.A.Child', has: '2.name', eq: 'To' }
    , { fqn: 'Child.With:inlet', has: '3.name', eq: 'inlet' }
    , { fqn: ':inlet-without-path', has: '0.type', eq: 'inlet' }
    , { fqn: 'Child.With[data . field]', has: '3.path', eq: 'data.field', nostr: true }
    , { fqn: '[data.field.without.path]', has: '0.type', eq: 'data' }
    , { fqn: '.Child.With.Model/and/field/and/subfield', has: '3.type', eq: 'field' }
    , { fqn: '.Path.To.Model<.With/path.Paramerter>', has: '2.args.0.1.type', eq: 'field' }
    , { fqn: '.Model<A,[with.data.parameter]>.And.SubChild', has: '0.args.1.0.type', eq: 'data' }
    , { fqn: '.Model<With[mixed],[parameter]>', has: '0.args.0.2.path', eq: 'mixed' }
    ].map(function (e) {
      it('should parse: ' + e.fqn, function () {
        var fqn = Yolo.Fqn.parse(e.fqn);
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
          console.log(e.fqn, require('util').inspect(fqn, null, 10));
          process.exit();
        }
        /**/
        return ;
      });
      if (e.nostr != true) {
        it('sould serialize: ' + e.fqn, function () {
          assert.equal(Yolo.Fqn.stringify(Yolo.Fqn.parse(e.fqn)), e.fqn);
        });
      }
    });

  });

});
