var PEG   = require('pegjs');

module.exports = function (node) {

  node.on('compute', function (content, callback) {
    if (typeof content == 'string') content = { source: content };
    try { var parser = PEG.buildParser(content.source); }
    catch (e) { return callback(Yolo.Util.wrapError(e, content)); }
    return callback(null, parser);
  });

  return node;
};
