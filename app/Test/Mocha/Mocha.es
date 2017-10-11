/*!UroxGvT3uDMQCT1va20i43ZZSxo*/
import Mocha from 'mocha';
import assert from 'assert';

export default function (node, logger) {

  node.on('run')
    .then(function ({}) { return this.node.get('modules') || []; }).replace('modules')
    .then(function () { return new Mocha(); }).replace('mocha')
    .Fold([], 'modules')
    .  then(function ({ value: module, accu, flow: { mocha } }, callback) {
         var suite = new Mocha.Suite(module, mocha);
         mocha.suite.suites.push(suite);
         return toplevel.Root.create(module, module, (err, slice) => {
           if (err) return logger.error(err);
           const node = slice.leaf;
           const tests = node.get('mocha');
           const list = Object.keys(tests).map(name => {
             var test = tests[name];
             if (test.name == null) test.name = name;
             test.mocha = mocha;
             test.suite = suite;
             test.node = node;
             return test;
           });
           Array.prototype.push.apply(accu, list);
           return callback(null, accu);
         });
       })
       .end()
    .Fold().as('$:value')
    .  then(function (test) {
         var mochaTest = new Mocha.Test(test.label || test.name, done => {
           return test.node.send(':' + test.method, test.flow, (error, result) => {
             return this.node.send(':check-result', { test, error, result }, err => {
               return done(err);
             });
           });
         });
         mochaTest.parent = test.suite;
         test.suite.tests.push(mochaTest);
         return test.mocha;
       })
    .  end()
    .then(function (mocha, callback) {
      mocha.run(callback);
    })
    .end()

  node.on('check-result', function ({ test, error, result }, callback) {
    if (test.expectError) {
      result = error
      error = null;
    }
    if (error) return callback(error);
    if (typeof test.assert == 'function') {
      if (test.assert.length > 2) {
        try { return test.assert(result, test.result, callback); }
        catch (err) { return callback(err); }
      } else {
        try { test.assert(result, test.result); }
        catch (err) { return callback(err); }
      }
    } else {
      var testName = test.assert || 'deepEqual';
      try { assert[testName](result, test.result); }
      catch (err) { return callback(err); }
    }
    return callback(null, null);
  });

};
