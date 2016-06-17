var Url    = require('url');
var fs     = require('fs');
var path   = require('path');
var async  = require('async');

module.exports = function (node) {

  var cache = new Yolo.Cache();

  node.on('url', function (url, event) {
    if (typeof url == 'string') url = Url.parse(url);
    if (url.protocol == null) url.protocol = 'file:';
    var method = 'data' in event.replier ? 'streamable' : 'content';
    if (url.cache) url.cache_key = Yolo.Digest(url);
    if (cache.has(url.cache_key)) return event.reply(null, cache.get(url.cache_key));
    node.logger.log('Retriving %s', url);
    switch (url.protocol) {
    case 'file:':
      var fp = url.path || url.filepath || url.url;
      url.filepath = fp;
      if (fp[0] == '/') {
        return node.emit('file-absolute-' + method, url, event);
      } else {
        return node.emit('file-relative-' + method, url, event);
      }
    case 'http:': case 'https:':
      return node.emit('http-' + method, url, event);
    default:
      return event.reply(new Error('Protocol not yet implemented'));
    }
  });

  node.on('file-absolute-content', function (request, event) {
    return fs.readFile(request.filepath, function (err, buffer) {
      if (err) return event.reply('fail', err);
      var response = buffer.toString();
      if (request.cache_key == null) return event.reply(null, response);
      return node.emit('cache', { request: request, response: response }, event);
    });
  });

  node.on('file-absolute-streamable', function (request, event) {
    return event.reply(new Error('not yet implemented'));
  });

  node.on('file-relative-content', function (request, event) {
    var files = toplevel.paths.slice();
    return async.reduce(files, [], function (stack, wd, callback) {
      var filepath = path.join(wd, request.filepath);
      return fs.readFile(filepath, function (err, buffer) {
        if (err) return callback(null, stack);
        if (request.first) return event.reply(null, buffer.toString());
        stack.push(buffer.toString());
        return callback(null, stack);
      });
    }, function (err, stack) {
      if (err) {
        return event.reply(err);
      } else if (stack.length == 0) {
        err = { code: 'NOT_FOUND', message: 'file ' + request.filepath + ' not found' };
        return event.reply(Yolo.Util.wrapError(err));
      } else {
        return event.reply(null, stack.join('\n'));
      }
    });
  });

  node.on('file-relative-streamable', function (request, event) {
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
    cache.set(key, payload.response, payload.request.cache > 0 ? payload.request.cache : Infinity);
    return event.reply(null, payload.response);
  });

  return node;
};

