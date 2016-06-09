var Jade    = require('jade');
var Runtime = require('./Runtime.Jade.js');

module.exports = function (node) {

  var unindent = function (source) {
    var lines = source.split(/\r?\n/);
    while (/^\s*$/.test(lines[0])) lines.shift();
    while (/^\s*$/.test(lines[lines.length - 1])) lines.pop();
    if (lines[0] == null) return source;
    var offset = 0;
    while (/^\s$/.test(lines[0][offset])) offset += 1;
    var indent = lines[0].substr(0, offset);
    for (var i = 0; i < lines.length; i++) {
      if (lines[i].indexOf(indent) != 0) return source;
      lines[i] = lines[i].substr(offset);
    }
    return lines.join('\n');
  };

  node.on('inlet-create', function (content, event) {
    if (typeof content == 'string') content = { source: content };
    content.source = unindent(content.source);
    var inlet = { source: content.source, template: !!~content.source.indexOf('${') };
    try { var producer = Jade.compile(content.source, node.get('context')); }
    catch (e) { return event.reply(Yolo.Util.wrapError(e, content.source)); }
    inlet.producer = producer;
    try { var clientStr = Jade.compileClient(content.source, node.get('context')); }
    catch (e) { var clientStr = 'function () { return "compile failed"; }'; }
    return node.send('Language.Javascript:compress', { source: clientStr }, function (err, code) {
      if (err) return event.reply(err);
      inlet.serialize = function (iterator) {
        var inlet = { source: '<no available>' };
        inlet.call = new Function
        ( 'payload, event'
        , [ 'this.producer = ' + code + ';'
          , 'this.call = function (payload, event) {'
          , '  return toplevel.runtimes.Jade.producer(this, payload, event);'
          , '};'
          , 'return this.call(payload, event);'
          ].join('\n')
        );
        return Yolo.Util.serialize(inlet, true, iterator);
      };
      inlet.call = function (payload, event) {
        return Runtime.Jade.producer(this, payload, event);
      };
      return event.reply(null, inlet);
    });
  });

  /********************************************************************/


};
