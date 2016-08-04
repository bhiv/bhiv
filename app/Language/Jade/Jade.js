var Jade    = require('pug');
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

  node.on('inlet-create', function (content, flux) {
    if (typeof content == 'string') content = { source: content };
    content.source = unindent(content.source);
    var inlet = { source: content.source, template: !!~content.source.indexOf('${') };
    var context = node.get('context') || {};
    if (content.filename != null) context.filename = content.filename;
    try { var producer = Jade.compile(content.source, context); }
    catch (e) { console.log(content); return flux(Yolo.Util.wrapError(e, content.source)); }
    inlet.producer = producer;
    try { var clientStr = Jade.compileClient(content.source, node.get('context')); }
    catch (e) { var clientStr = 'function () { return "compile failed"; }'; }
    return node.send('Language.Javascript:compress', { source: clientStr }, function (err, code) {
      if (err) return flux(err);
      inlet.serialize = function (iterator) {
        var inlet = { source: '<no available>' };
        inlet.call = new Function
        ( 'payload, flux'
        , [ 'this.producer = function () { ' + code + '; return template; }();'
          , 'this.call = function (payload, flux) {'
          , '  return toplevel.runtimes.Jade.producer(this, payload, flux);'
          , '};'
          , 'return this.call(payload, flux);'
          ].join('\n')
        );
        return Yolo.Util.serialize(inlet, true, iterator);
      };
      inlet.call = function (payload, flux) {
        return Runtime.Jade.producer(this, payload, flux);
      };
      return flux(null, inlet);
    });
  });

  /********************************************************************/


};
