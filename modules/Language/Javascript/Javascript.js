var uj    = require('uglify-js');

module.exports = function (node) {

  node.on('inlet-create', function (content, event) {
    if (typeof content == 'string') content = { source: content };
    //content.source += '//# sourceURL=' + content.filepath;
    return node.emit('compress', content, function (err, source) {
      if (err) return event.reply(err);
      try { var fn = new Function('node, data, event', source); }
      catch (e) { return event.reply(Yolo.Util.wrapError(e, content)); }
      var inlet = { execute: fn };
      return node.emit('inlet-consolidate', inlet, event);
    });
  });

  node.on('inlet-consolidate', function (inlet, event) {
    inlet.call = function (data, event) {
      try { return this.execute(this.node, data, event); }
      catch (e) { return event.reply('fail', Yolo.Util.wrapError(e)); }
    };
    return event.reply('done', inlet);
  });

  node.on('parse', function (source, event) {
    var content = { source: source };
    return node.emit('compress', content, function (err, source) {
      if (err) return event.reply(err);
      try { var fn = new Function('node,data', source); }
      catch (e) { return event.reply(Yolo.Util.wrapError(e, content)); }
      return event.reply('done', fn);
    });
  });

  node.on('compress', function (code, event) {
    if (typeof code == 'string') code = { source: code };
    if (node.get('compress') !== false || code.force == true) {
      var options = { fromString: true, parse: { bare_returns: true } };
      var result = uj.minify(code.source, options);
      return event.reply(null, result.code);
    } else {
      return event.reply('done', code.source);
    }
  });

  return node;
};