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

    A.on('dump', function (alpha) { console.log(alpha); return alpha; });
    A.on('get-one', function (number) { return 1; });
    A.on('plus-one', function (number) { return number + 1; });
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
      A.on('test-format').as({ wrap: 'jp:@' }).end();
    });
    it('as - call', function (done) {
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
      A.on('test-map').Map('list').then(':plus-one', '$:value').end().replace('list').end();
    });
    it('map - call', function (done) {
      A.emit('test-map', { list: [0,1,2,3] }, check({ list: [1,2,3,4] }, done));
    });

    it('fold - declare', function () {
      A.on('test-fold')
        .Fold(14, 'value')
        .  then(':left-plus-right', { left: '$:accu', right: '$:value' })
        .  end().replace('value')
        .end();
    });
    it('fold - call', function (done) {
      A.emit('test-fold', { value: [1,2,3,4,5,6,7] }, check({ value: 42 }, done));
    });

    it('reduce - declare', function () {
      A.on('test-reduce').Reduce().then(':concat-left-right-10ms-async').end().end();
    });
    it('reduce - call - empty', function (done) {
      A.emit('test-reduce', [], check(null, done));
    });
    it('reduce - call - single', function (done) {
      A.emit('test-reduce', [1], check(1, done));
    });
    it('reduce - call - multi with time checking', function (done) {
      var str = 'abcdefghi';
      this.timeout(((str.length - 1) * 10) - 5);
      A.emit('test-reduce', str.split(''), check(str, done));
    });

    it('filter - declare', function () {
      A.on('test-filter')
        .Filter().then(':is-even', '$:value').end()
        .wrap({ evens: '$:result', list: '$:payload' })
        .end();
    });
    it('filter - call', function (done) {
      A.emit('test-filter', [0,1,2,3], check({ evens: [1,3], list: [0,1,2,3] }, done));
    });

    it('detect - declare - sync success', function () {
      A.on('test-detect-sync-success')
        .Detect().then(':is-even', '$:value').end()
        .end();
    });
    it('detect - call - sync success', function (done) {
      A.emit('test-detect-sync-success', [0,2,3,4,6,8], check(3, done));
    });

    it('detect - declare - async success', function () {
      A.on('test-detect-async-success')
        .Detect().then(':is-even-async', '$:value').end()
        .end();
    });
    it('detect - call - async success 1', function (done) {
      A.emit('test-detect-async-success', [0,2,3,4,6,8], check(3, done));
    });
    it('detect - call - async success 2', function (done) {
      A.emit('test-detect-async-success', [3,4,6,0,2,8], check(3, done));
    });
    it('detect - call - async success 3', function (done) {
      A.emit('test-detect-async-success', [0,2,4,6,8,3], check(3, done));
    });

    it('detect - declare - sync with error', function () {
      A.on('test-detect-sync-with-errors')
        .Detect().then(':is-even-not-div4', '$:value').end()
        .end();
    });
    it('detect - call - sync with error', function (done) {
      A.emit('test-detect-sync-with-errors', [0,2,4,6,3,8], check(3, done));
    });

    it('detect - declare - async with error', function () {
      A.on('test-detect-async-with-errors')
        .Detect().then(':is-even-not-div4-async', '$:value').end()
        .end();
    });
    it('detect - call - async with error', function (done) {
      A.emit('test-detect-async-with-errors', [0,2,4,6,3,8], check(3, done));
    });

    it('detect - declare - error', function () {
      A.on('test-detect-async-error')
        .Detect().then(':is-even-not-div4-async', '$:value').end()
        .end();
    });
    it('detect - call - async with error', function (done) {
      A.emit('test-detect-async-error', [4,8,16,24], function (err) {
        if (err) return done();
        else return done('Exptect an error');
      });
    });

    // Flow routing
    it('match - declare', function () {
      A.on('test-match-when')
        .Match('$:value')
        .  WhenEquiv(1).as('when-equal-1')
        .  When(/reqexp-match/).as('when-regexp-match')
        .  When(function (a) { return (a + '').indexOf('XX42') > 0; }).as('when-function-succeed')
        .  When('$:field').as('when-query-field')
        .  WhenType('Date').as('when-type-date')
        .  Otherwise().as('when-no-case-match')
        .  end()
        .end();
    });
    it('match - call - 1', function (done) {
      A.emit('test-match-when', { value: 1 }, check('when-equal-1', done));
    });
    it('match - call - rxp', function (done) {
      A.emit('test-match-when', { value: 'blreqexp-matcha' }, check('when-regexp-match', done));
    });
    it('match - call - fn', function (done) {
      A.emit('test-match-when', { value: 'blaXX42bla' }, check('when-function-succeed', done));
    });
    it('match - call - query', function (done) {
      A.emit('test-match-when', { value: { field: true } }, check('when-query-field', done));
    });
    it('match - call - type', function (done) {
      A.emit('test-match-when', { value: new Date() }, check('when-type-date', done));
    });
    it('match - call - otherwise', function (done) {
      A.emit('test-match-when', { value: null }, check('when-no-case-match', done));
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
      A.emit('test-unless', {}, check(2, done));
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
      return A.emit('test-memoize', flow, function (err, r1) {
        if (err) return done(err);
        return A.emit('test-memoize', flow, function (err, r2) {
          if (err) return done(err);
          if (r1 != r2) return done('Should return same result');
          return check('ab', done)(null, r2);
        });
      });
    });

    it('shunt - declare', function () {
      A.on('test-shunt')
        .shunt('$:shouldIReturn', '$:whatIShouldReturn')
        .as(42)
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

  });

});
