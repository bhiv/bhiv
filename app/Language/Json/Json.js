module.exports = function (node) {

  node.on('parse', function (content, callback) {
    try { content = JSON.parse(content); }
    catch (e) { return callback(Yolo.Util.wrapError(e)); }
    return callback(null, content);
  });

  return node;
};