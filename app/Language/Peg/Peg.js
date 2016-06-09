var PEG   = require('pegjs');

module.exports = function (node) {

  node.on('compute', function (content, event) {
    if (typeof content == 'string') content = { source: content };
    try { var parser = PEG.buildParser(content.source); }
    catch (e) { return event.reply('fail', Yolo.Util.wrapError(e, content)); }
    return event.reply('done', parser);
  });

  return node;
};
