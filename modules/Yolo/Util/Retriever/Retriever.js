var Url    = require('url');
var fs     = require('fs');
var path   = require('path');

module.exports = function (node) {

  var cache = new Yolo.Cache();

  node.on('url', function (url, event) {
    node.logger.log('Retriving %s', url);
    if (typeof url == 'string') url = Url.parse(url);
    if (url.protocol == null) url.protocol = 'file:';
    var method = 'data' in event.replier ? 'streamable' : 'content';
    if (url.cache > 0) url.cache_key = Yolo.Digest(url);
    if (cache.has(url.cache_key)) return event.reply(null, cache.get(url.cache_key));
    switch (url.protocol) {
    case 'file:':
      var fp = url.path || url.filepath || url.url;
      url.filepath = fp[0] == '/' ? fp : path.join(toplevel.dirname, fp);
      return node.emit('file-' + method, url, event);
    case 'http:': case 'https:':
      return node.emit('http-' + method, url, event);
    default:
      return event.reply(new Error('Protocol not yet implemented'));
    }
  });

  node.on('file-content', function (request, event) {
    return fs.readFile(request.filepath, function (err, buffer) {
      if (err) return event.reply('fail', err);
      var response = buffer.toString();
      if (request.cache_key == null) return event.reply(null, response);
      return node.emit('cache', { request: request, response: response }, event);
    });
  });

  node.on('file-streamable', function (request, event) {
    return event.reply(new Error('not yet implemented'));
  });

  node.on('http-content', function (request, event) {
    return node.send('Adapter.Http.Client:request', request, function (err, response) {
      if (err) return event.reply('fail', err);
      if (request.cache_key == null) return event.reply(null, response);
      return node.emit('cache', { request: request, response: response }, event);
    });
  });

  node.on('http-streamable', function (request, event) {
    return event.reply(new Error('not yet implemented'));
  });

  node.on('cache', function (payload, event) {
    var key = payload.request.cache_key;
    if (key == null) return event.reply(null, payload.response);
    cache.set(key, payload.response, payload.request.cache);
    return event.reply(null, payload.response);
  });

  return node;
};

