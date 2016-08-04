var PEG   = require('pegjs');

module.exports = function (node) {

  var cache = new Yolo.Cache();

  node.on('compute', function (content, callback) {
    if (typeof content == 'string') content = { source: content };
    try { var parser = PEG.buildParser(content.source); }
    catch (e) { return callback(Yolo.Util.wrapError(e, content)); }
    return callback(null, parser);
  });

  node.on('parse-value-from-peg-file', function (request, callback) {
    if (cache.has(request.file))
      return callback(null, cache.get(request.file).parse(request.value));
    var count = cache.queue(request.file, function (parser) {
      return callback(null, parser.parse(request.value));
    });
    if (count > 1) return ;
    return node.send('Yolo.Util.Retriever:request', request.file, function (err, content) {
      if (err) {
        cache.remove(request.file);
        return callback(err);
      }
      return node.emit('compute', content, function (err, parser) {
        if (err) {
          cache.remove(request.file);
          return callback(err);
        }
        return cache.set(request.file, parser);
      });
    });
  });

};
