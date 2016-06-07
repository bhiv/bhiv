module.exports = function (node) {

  node.on('parse', function (content, event) {
    try { content = JSON.parse(content); }
    catch (e) { return event.reply('fail', Yolo.Util.wrapError(e)); }
    return event.reply('done', content);
  });

  return node;
};