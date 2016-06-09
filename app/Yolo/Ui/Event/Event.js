var Bhiv    = require('bhiv');
var Runtime = require('./Runtime.Event.js');

module.exports = function (node) {

  node.on('parse-rule', function (pair, event) {
    var rule = pair.rule;
    var eventName = rule.args[0];
    var selector = rule.args.slice(1).join(' ');
    var isTemplate = !!~rule.value.indexOf('${');
    var inlet = { event: eventName, selector: selector, source: '<source>', template: isTemplate };

    var caller = function (data, event) {
      Runtime.Event.wrapInlet(this);
      return event.reply('done', data);
    };

    caller.serialized =
      [ 'function (data, event) {'
      , '  toplevel.runtimes.Event.wrapInlet(this);'
      , '  return event.reply("done", data);'
      , '}'
      ].join('\n');

    caller.toString = function () { return caller.serialized; };

    inlet.call = caller;

    if (pair.structure.inlets == null)
      pair.structure.inlets = {};

    if (!(pair.structure.inlets.dom instanceof Array))
      pair.structure.inlets.dom = [];

    pair.structure.inlets.dom.push(inlet)

    return node.send('Language.Javascript:compress', { source: rule.value }, function (err, code) {
      if (err) return event.reply(err);
      inlet.source = code;
      return event.reply();
    });
  });

};