require('pegjs-require');
var Yolo = require('../lib/Yolo.js');
var assert = require('assert');
var jmespath = require('jmespath');

var old_runtime_resolve = Yolo.VM.Runtime.prototype.resolve;
Yolo.VM.Runtime.prototype.resolve = function (str, data, callback) {
  switch (str.substr(0, str.indexOf(':'))) {
  case 'jp':
    try { data = jmespath.search(data, str.substr(3)); }
    catch (e) {
      console.warn(e);
      return callback(null, null);
    }
    return callback(null, data);
  default:
    return old_runtime_resolve(str, data, callback);
  }
};

var check = function (data, done) {
  return function (err, value) {
    try { assert.deepEqual(value, data); }
    catch (e) { return done(e); }
    return done(err);
  };
};

describe('Yolo', function () {

  describe('VM.AST', function () {

    var A = new Yolo.Node('A');
    A.on('plus-one', function (number) { return number + 1; });
    A.on('plus-one-as-foo', function (number) { return { foo: number + 1 }; });
    A.on('left-plus-right', function (record) { return record.left + record.right; });

    it('format - declare', function () {
      A.on('test-format').as({ wrap: 'jp:@' }).end();
    });
    it('format - call', function (done) {
      A.emit('test-format', 42, check({ wrap: 42 }, done));
    });

    it('then / format - declare', function () {
      A.on('test-then-format').then(':test-format', 'jp:value').end();
    });
    it('then / format - call', function (done) {
      A.emit('test-then-format', { value: 42 }, check({ wrap: 42 }, done));
    });

    it('then & wrap - declare', function () {
      A.on('test-then-format-wrap')
        .then(':plus-one', 'jp:value').wrap({ v: '$:payload.value', r: '$:result' })
        .end();
    });
    it('then & wrap - call', function (done) {
      A.emit('test-then-format-wrap', { value: 41 }, check({ v: 41, r: 42 }, done));
    });

    it('then & merge - declare', function () {
      A.on('test-then-format-merge').then(':plus-one-as-foo', 'jp:value').merge().end();
    });
    it('then & merge - call', function (done) {
      A.emit('test-then-format-merge', { value: 41 }, check({ value: 41, foo: 42 }, done));
    });

    it('then & put - declare', function () {
      A.on('test-then-format-put').then(':plus-one', 'jp:value').merge('auqlue').end();
    });
    it('then & put - call', function (done) {
      A.emit('test-then-format-put', { value: 41 }, check({ auqlue: 42, value: 41 }, done));
    });

    it('then & replace - declare', function () {
      A.on('test-then-format-replace').then(':plus-one', 'jp:value').replace('value').end();
    });
    it('then & replace - call', function (done) {
      A.emit('test-then-format-replace', { value: 41 }, check({ value: 42 }, done));
    });

    it('apply - declare', function () {
      A.on('test-apply').apply('val.ue', ':plus-one').end();
    });
    it('apply - call', function (done) {
      A.emit('test-apply', { val: { ue: 41 } }, check({ val: { ue: 42 } }, done));
    });

    // Control Flow
    it('race - declare', function () {
      A.on('test-race').as('$:some.where').Race()
        .  At('field1', 'jp:@').then(':plus-one', '$:data')
        .  At('field2').then(':plus-one', '$:data.two').then(':plus-one')
        .  end()
        .end();
    });
    it('race - call', function (done) {
      A.emit( 'test-race'
            , { some: { where: { data: 0 } } }
            , check({ field1: 1, field2: 2 }, done)
            );
    });
    // TODO:test race errors

    it('until - declare - 1', function () {
      A.on('test-until-1').Until('jp:times<`10`', '$:flow').then(':plus-one').end().end();
    });
    it('until - call - 1', function (done) {
      A.emit('test-until-1', 0, check(10, done));
    });

    it('until - declare - 2', function () {
      A.on('test-until-2').Until('jp:times<`10`').then(':plus-one', '$:flow').end().end();
    });
    it('until - call - 2', function (done) {
      A.emit('test-until-2', 0, check(10, done));
    });

    // Collections
    it('map - declare', function () {
      A.on('test-map').Map('list').as('$:value').then(':plus-one').end().replace('list').end();
    });
    it('map - call', function (done) {
      A.emit('test-map', { list: [0,1,2,3] }, check({ list: [1,2,3,4] }, done));
    });

    it('fold - declare', function () {
      A.on('test-fold')
        .Fold(14, null)
        .  as({ left: '$:accu', right: '$:value' })
        .  then(':left-plus-right')
        .  end()
        .end();
    });
    it('fold - call', function (done) {
      A.emit('test-fold', [1,2,3,4,5,6,7], check(42, done));
    });

    it('fold - declare - replace', function () {
      A.on('test-fold-replace')
        .Fold(14, 'value')
        .  as({ left: '$:accu', right: '$:value' })
        .  then(':left-plus-right')
        .  end().replace('value')
        .end();
    });
    it('fold - call - replace', function (done) {
      A.emit('test-fold-replace', { value: [1,2,3,4,5,6,7] }, check({ value: 42 }, done));
    });

    // Flow routing
  });

});
