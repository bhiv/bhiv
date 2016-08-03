var less  = require('less');

module.exports = function (node, logger, Bee) {

  node.on('parse', function (content, event) {
    if (typeof content == 'string') content = { source: content };
    var obj = Bhiv.compute(content.source);
    var options = { sourceMap: { sourceMapFileInline: false }, compress: true };
    return less.render(obj.template, options, function (err, result) {
      if (err) return event.reply(Yolo.Util.wrapError(err, content.source));
      obj.template = result.css;
      return event.reply(null, obj);
    });
  });

  node.on('inlet-create', function (content, event) {
    return node.emit('parse', content, function (err, css) {
      if (err) return event.reply(err);
      var inlet = { css: css };
      return node.emit('inlet-consolidate', inlet, event);
    });
  });

  node.on('inlet-consolidate', function (inlet, event) {
    inlet.call = function (data, event) {
      if (/^[\s\n]*$/.test(this.css)) return event.reply();
      var style = { id: this.node.id, value: this.css };
      return event.reply(null, style);
    };
    inlet.serialize = function () {
      return (
        [ '{ css: ' + JSON.stringify(this.css)
        , ', call: ' + Yolo.Util.serialize(this.call)
        , '}'
        ].join('')
      );
    };
    return event.reply(null, inlet);
  });

  node.on('http-serve', new Bee()
          .then('Yolo.Util.Retriever:request', 'static/${params.filepath}.less', { content: '${.}' })
          .pipe(':parse', '${content}', { type: 'css', content: '${template}' })
          .end()
         );

};