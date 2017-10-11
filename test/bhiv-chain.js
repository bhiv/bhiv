require('pegjs-require');
var Bhiv = require('../lib/Bhiv.js');
var assert = require('assert');
var jmespath = require('jmespath');

Bhiv.VM.DSL.jp = function (dsl, data, callback) {
  try { data = jmespath.search(data, dsl.substr(3)); }
  catch (e) {
    console.warn(e);
    return callback(null, null);
  }
  return callback(null, data);
};

var check = function (data, done) {
  return function (err, value) {
    try { assert.deepEqual(value, data); }
    catch (e) { return done(e); }
    return done(err);
  };
};

var dump = function (value) {
  console.log(value);
  return value;
};

describe('Bhiv', function () {

  describe('VM.AST', function () {

    var A = new Bhiv.Node('A');

    A.on('dump', function (alpha) { console.log(alpha); return alpha; });
    A.on('get-one', function (number) { return 1; });
    A.on('plus-one', function (number) { return number + 1; });
    A.on('plus-two', function (number) { return number + 2; });
    A.on('plus-ten', function (number) { return number + 10; });
    A.on('plus-one-as-foo', function (number) { return { foo: number + 1 }; });
    A.on('left-plus-right', function (record) { return record.left + record.right; });
    A.on('concat-left-right-10ms-async', function (record, callback) {
      return setTimeout(function () {
        return callback(null, [record.left, record.right].join(''));
      }, (Math.random() * 4 | 0) + 8);
    });
    A.on('concat-left-right-20ms-async', function (record, callback) {
      return setTimeout(function () {
        return callback(null, [record.left, record.right].join(''));
      }, (Math.random() * 4 | 0) + 18);
    });
    A.on('is-even', function (number) { return !!(number % 2); });
    A.on('is-even-async', function (number, cb) {
      return setTimeout(function () { cb(null, !!(number % 2)); }, Math.random() * 30 | 0);
    });
    A.on('is-even-not-div4', function (number) {
      if (number > 0 && (number % 4) == 0) throw new Error('Dividable by 4 not permited');
      return !!(number % 2);
    });
    A.on('is-even-not-div4-async', function (number, cb) {
      return setTimeout(function () {
        if (number > 0 && (number % 4) == 0) return cb(new Error('Dividable by 4 not permited'));
        return cb(null, !!(number % 2));
      }, Math.random() * 30 | 0);
    });

    /***************************/

    it('as - declare', function () {
      A.on('test-format').as({ wrap: '$:@' }).end();
    });
    it('as - call', function (done) {
      A.execute('test-format', 42, check({ wrap: 42 }, done));
    });

    it('then / format - declare', function () {
      A.on('test-then-format').then(':test-format', '$:value').end();
    });
    it('then / format - call', function (done) {
      A.execute('test-then-format', { value: 42 }, check({ wrap: 42 }, done));
    });

    it('then & wrap - declare', function () {
      A.on('test-then-format-wrap')
        .then(':plus-one', '$:value').wrap({ v: '$:payload.value', r: '$:result' })
        .end();
    });
    it('then & wrap - call', function (done) {
      A.execute('test-then-format-wrap', { value: 41 }, check({ v: 41, r: 42 }, done));
    });

    it('then & merge - declare', function () {
      A.on('test-then-format-merge').then(':plus-one-as-foo', '$:value').merge().end();
    });
    it('then & merge - call', function (done) {
      A.execute('test-then-format-merge', { value: 41 }, check({ value: 41, foo: 42 }, done));
    });

    it('then & put - declare', function () {
      A.on('test-then-format-put').then(':plus-one', '$:value').merge('auqlue').end();
    });
    it('then & put - call', function (done) {
      A.execute('test-then-format-put', { value: 41 }, check({ auqlue: 42, value: 41 }, done));
    });

    it('then & replace - declare', function () {
      A.on('test-then-format-replace').then(':plus-one', '$:value').replace('value').end();
    });
    it('then & replace - call', function (done) {
      A.execute('test-then-format-replace', { value: 41 }, check({ value: 42 }, done));
    });

    it('apply - declare', function () {
      A.on('test-apply').apply('val.ue', ':plus-one').end();
    });
    it('apply - call', function (done) {
      A.execute('test-apply', { val: { ue: 41 } }, check({ val: { ue: 42 } }, done));
    });

    // Control Flow
    it('race - no args - declare', function () {
      A.on('test-race').as('$:some.where').Race()
        .  At('field1').then(':plus-one', '$:data')
        .  At('field2').then(':plus-one', '$:data.two').then(':plus-one')
        .  end()
        .end();
    });
    it('race - no args - call', function (done) {
      A.execute( 'test-race'
               , { some: { where: { data: 0 } } }
               , check({ field1: 1, field2: 2 }, done)
               );
    });
    it('race - array - declare', function () {
      A.on('test-race-array').as('$:some.where').Race([])
        .  At(0).then(':plus-one', '$:data')
        .  At(1).then(':plus-one', '$:data.two').then(':plus-one')
        .  end()
        .end();
    });
    it('race - array - call', function (done) {
      A.execute( 'test-race-array'
               , { some: { where: { data: 0 } } }
               , check([1, 2], done)
               );
    });
    // TODO:test race errors

    it('until - declare - 1', function () {
      A.on('test-until-1').Until('jp:times<`10`', 0, '$:flow').then(':plus-one').end().end();
    });
    it('until - call - 1', function (done) {
      A.execute('test-until-1', 0, check(10, done));
    });
    it('until - declare - delayed', function () {
      A.on('test-until-1-bis').Until('jp:times<`2`', 10, '$:flow').then(':plus-one').end().end();
    });
    it('until - call - delayed', function (done) {
      var canResponde = false
      setTimeout(function () { canResponde = true }, 20);
      A.execute('test-until-1-bis', 0, function (err, suc) {
        if (canResponde) return check(2, done)(err, suc);
        return done('has responded too early');
      });
    });
    it('until - declare - 2', function () {
      A.on('test-until-2').Until('jp:times<`10`').then(':plus-one', '$:flow').end().end();
    });
    it('until - call - 2', function (done) {
      A.execute('test-until-2', 0, check(10, done));
    });

    // Collections
    it('map - declare', function () {
      A.on('test-map').Map('list').then(':plus-one', '$:value').end().replace('list').end();
    });
    it('map - call', function (done) {
      A.execute('test-map', { list: [0,1,2,3] }, check({ list: [1,2,3,4] }, done));
    });

    it('fold - declare', function () {
      A.on('test-fold')
        .Fold(14, 'value')
        .  then(':left-plus-right', { left: '$:accu', right: '$:value' })
        .  end().replace('value')
        .end();
    });
    it('fold - call', function (done) {
      A.execute('test-fold', { value: [1,2,3,4,5,6,7] }, check({ value: 42 }, done));
    });

    it('reduce - declare', function () {
      A.on('test-reduce').Reduce().then(':concat-left-right-10ms-async').end().end();
    });
    it('reduce - call - empty', function (done) {
      A.execute('test-reduce', [], check(null, done));
    });
    it('reduce - call - single', function (done) {
      A.execute('test-reduce', [1], check(1, done));
    });
    it('reduce - call - multi with time checking', function (done) {
      var str = 'abcdefghi';
      this.timeout(((str.length - 1) * 10) - 5);
      A.execute('test-reduce', str.split(''), check(str, done));
    });

    it('filter - declare', function () {
      A.on('test-filter')
        .Filter().then(':is-even', '$:value').end()
        .wrap({ evens: '$:result', list: '$:payload' })
        .end();
    });
    it('filter - call', function (done) {
      A.execute('test-filter', [0,1,2,3], check({ evens: [1,3], list: [0,1,2,3] }, done));
    });

    it('detect - declare - sync success', function () {
      A.on('test-detect-sync-success')
        .Detect().then(':is-even', '$:value').end()
        .end();
    });
    it('detect - call - sync success', function (done) {
      A.execute('test-detect-sync-success', [0,2,3,4,6,8], check(3, done));
    });

    it('detect - declare - async success', function () {
      A.on('test-detect-async-success')
        .Detect().then(':is-even-async', '$:value').end()
        .end();
    });
    it('detect - call - async success 1', function (done) {
      A.execute('test-detect-async-success', [0,2,3,4,6,8], check(3, done));
    });
    it('detect - call - async success 2', function (done) {
      A.execute('test-detect-async-success', [3,4,6,0,2,8], check(3, done));
    });
    it('detect - call - async success 3', function (done) {
      A.execute('test-detect-async-success', [0,2,4,6,8,3], check(3, done));
    });

    it('detect - declare - sync with error', function () {
      A.on('test-detect-sync-with-errors')
        .Detect().then(':is-even-not-div4', '$:value').end()
        .end();
    });
    it('detect - call - sync with error', function (done) {
      A.execute('test-detect-sync-with-errors', [0,2,4,6,3,8], check(3, done));
    });

    it('detect - declare - async with error', function () {
      A.on('test-detect-async-with-errors')
        .Detect().then(':is-even-not-div4-async', '$:value').end()
        .end();
    });
    it('detect - call - async with error', function (done) {
      A.execute('test-detect-async-with-errors', [0,2,4,6,3,8], check(3, done));
    });

    it('detect - declare - error', function () {
      A.on('test-detect-async-error')
        .Detect().then(':is-even-not-div4-async', '$:value').end()
        .end();
    });
    it('detect - call - async with error', function (done) {
      A.execute('test-detect-async-error', [4,8,16,24], function (err) {
        if (err) return done();
        else return done('Exptect an error');
      });
    });

    // Flow routing
    it('match - declare', function () {
      A.on('test-match-when')
        .Match('$:value')
        .  WhenEquiv(1).put('when-equal-1')
        .  When(/reqexp-match/).put('when-regexp-match')
        .  When(function (a) { return (a + '').indexOf('XX42') > 0; }).put('when-function-succeed')
        .  When('$:field').put('when-query-field')
        .  WhenType('Date').put('when-type-date')
        .  Otherwise().put('when-no-case-match')
        .  end()
        .end();
    });
    it('match - call - 1', function (done) {
      A.execute('test-match-when', { value: 1 }, check('when-equal-1', done));
    });
    it('match - call - rxp', function (done) {
      A.execute('test-match-when', { value: 'blreqexp-matcha' }, check('when-regexp-match', done));
    });
    it('match - call - fn', function (done) {
      A.execute('test-match-when', { value: 'blaXX42bla' }, check('when-function-succeed', done));
    });
    it('match - call - query', function (done) {
      A.execute('test-match-when', { value: { field: true } }, check('when-query-field', done));
    });
    it('match - call - type', function (done) {
      A.execute('test-match-when', { value: new Date() }, check('when-type-date', done));
    });
    it('match - call - otherwise', function (done) {
      A.execute('test-match-when', { value: null }, check('when-no-case-match', done));
    });

    it('unless - declare', function () {
      A.on('test-unless')
        .Unless('$:requiredValue')
        .  then(':get-one').merge('requiredValue')
        .  end()
        .then(':plus-one', '$:requiredValue')
        .end();
    });
    it('unless - call', function (done) {
      A.execute('test-unless', {}, check(2, done));
    });

    it('memoize - declare', function () {
      A.on('test-memoize')
        .memoize(100)
        .then(':concat-left-right-20ms-async')
        .end();
    });
    it('memoize - call', function (done) {
      this.timeout(39);
      var flow = { left: 'a', right: 'b' };
      return A.execute('test-memoize', flow, function (err, r1) {
        if (err) return done(err);
        return A.execute('test-memoize', flow, function (err, r2) {
          if (err) return done(err);
          if (r1 != r2) return done('Should return same result');
          return check('ab', done)(null, r2);
        });
      });
    });

    it('shunt - declare', function () {
      A.on('test-shunt')
        .shunt('$:shouldIReturn', '$:whatIShouldReturn')
        .put(42)
        .end();
    });
    it('shunt - call - pass', function (done) {
      var data = { shouldIReturn: false, whatIShouldReturn: new Error('Bad Value') };
      A.begin(data).then(':test-shunt').end(check(42, done));
    });
    it('shunt - call - return', function (done) {
      var data = { shouldIReturn: true, whatIShouldReturn: 'yolo' };
      A.begin(data).then(':test-shunt').end(check('yolo', done));
    });

    // TODO: test assert

    it('trap - declare', function () {
      A.on('test-trap')
        .trap('jp:error.code == `42`', ':get-one')
        .failWith({ code: 42 })
        .end();
    });
    it('trap - call', function (done) {
      A.begin('bad-value').then(':test-trap').end(check(1, done));
    });

    // TODO: test sideway

    it('TOP 1 - declare', function () {
      A.on('test-top-1')
        .then(':plus-one')
        .Block('plus-ten').then(':plus-ten').end()
        .Block('plus-one').then(':plus-one').end()
        .end()
    });
    it('TOP 1 - call - 0', function (done) {
      A.begin(0).then(':test-top-1').end(check(12, done));
    });
    it('TOP 1 - call - 1', function (done) {
      A.begin(0).Then(':test-top-1').end().end(check(12, done));
    });
    it('TOP 1 - call - 2', function (done) {
      A.begin(0)
        .Then(':test-top-1')
        .  Replace('plus-ten', 4).then(':plus-one')
        .  Replace('plus-one').then(':plus-two')
        .  end()
        .end(check(7, done));
    });

    it('TOP 2 - declare - 1', function () {
      A.on('test-top-2')
        .as({ init: '$:@', value: 20 })
        .Race()
        .  At('init').as('$:init').Block('init').then(':plus-one').end()
        .  At('value').as('$:value').Block('value').then(':plus-ten').end()
        .  end()
        .then(':left-plus-right', { left: '$:init', right: '$:value' })
        .end()
    });
    it('TOP 2 - call - 1', function (done) {
      A.begin(0).then(':test-top-2').end(check(31, done));
    });
    it('TOP 2 - declare - 2', function () {
      A.on('test-top-2-overloaded')
        .Then(':test-top-2')
        .  Prepend('init').as(1)
        .  end()
        .end();
    });
    it('TOP 2 - call - 2', function (done) {
      A.begin(0).then(':test-top-2-overloaded').end(check(32, done));
    });
    it('TOP 2 - call - 3', function (done) {
      A.begin(0)
        .Then(':test-top-2-overloaded')
        .  Prepend('value').then(':plus-ten')
        .  end()
        .end(check(42, done));
    });

    it('Dynamic Module access - declare', function () {
      var B = new Bhiv.Node('B');
      B.on('test', () => 'rep:B');
      var C = new Bhiv.Node('C');
      C.on('test', () => 'rep:C');
      A.attach(B, 'B');
      A.attach(C, 'C');
      A.on('test-dyn-mod-access').then('.{.}:test').end();
    });
    it('Dynamic Module access - call B', function (done) {
      A.send(':test-dyn-mod-access', 'B', check('rep:B', done));
    });
    it('Dynamic Module access - call C', function (done) {
      A.send(':test-dyn-mod-access', 'C', check('rep:C', done));
    });

  });

});
