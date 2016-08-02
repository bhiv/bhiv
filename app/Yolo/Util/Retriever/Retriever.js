var Url    = require('url');
var fs     = require('fs');
var path   = require('path');
var async  = require('async');

module.exports = function (node) {

  var cache = new Yolo.Cache();

  /*************************************************/

  node.on('request', function (request, event) {
    if (typeof request == 'string') request = Url.parse(request);
    if (request.protocol == null) request.protocol = 'file:';
    var method = 'data' in event.replier ? 'streamable' : 'content';
    if (request.cache) request.cache_key = Yolo.Digest(request);
    if (method == 'content' && request.cache_key != null) {
      if (cache.has(request.cache_key)) return event.reply(null, cache.get(request.cache_key));
      var count = cache.queue(request.cache_key, function (result) {
        return event.reply(null, result);
      });
      if (count > 1) return ;
    }
    node.logger.log('Retrieving %s', Url.format(request));
    switch (request.protocol) {
    case 'file:':
      var fp = request.path || request.filepath || request.url;
      request.filepath = fp;
      if (fp[0] == '/') {
        return node.emit('file-absolute-' + method, request, event);
      } else {
        return node.emit('file-relative-' + method, request, event);
      }
    case 'http:': case 'https:':
      return node.emit('http-' + method, request, event);
    default:
      return event.reply(new Error('Protocol not yet implemented'));
    }
  });

  node.on('response', function (payload, event) {
    if (payload.request.parser) {
      return node.send(payload.request.parser, payload.response, function (err, content) {
        if (err) return event.reply(err);
        payload.response = content;
        return node.emit('response-cache', payload, event);
      });
    } else {
      return node.emit('response-cache', payload, event);
    }
  });

  node.on('response-cache', function (payload, event) {
    var key = payload.request.cache_key;
    if (key == null) return event.reply(null, payload.response);
    cache.set(key, payload.response, payload.request.cache > 0 ? payload.request.cache : Infinity);
    return ;
  });

  /**************************************************/

  node.on('file-absolute-content', function (request, event) {
    return fs.readFile(request.filepath, function (err, buffer) {
      if (err) return event.reply(err);
      var response = buffer.toString();
      return node.emit('response', { request: request, response: response }, event);
    });
  });

  node.on('file-absolute-streamable', function (request, event) {
    return event.reply(new Error('not yet implemented'));
  });

  node.on('file-relative-content', function (request, event) {
    var directories = toplevel.paths.slice().reverse();
    var files = directories.map(function (dir) { return path.join(dir, request.filepath); });
    var basename = path.basename(request.filepath);
    var extname = path.extname(request.filepath);
    if (/^[A-Z]/.test(basename)) {
      var tries = [];
      var dirname = basename.substr(0, basename.length - extname.length);
      for (var i = 0; i < files.length; i++) {
        var p = files[i].split('/');
        p.splice(-1, 0, dirname);
        tries.push(p.join('/'));
        tries.push(files[i]);
      }
    } else {
      var tries = files;
    }
    return async.reduce(tries, [], function (stack, filepath, callback) {
      return fs.readFile(filepath, function (err, buffer) {
        if (err) return callback(null, stack);
        var response = buffer.toString();
        if (request.first) {
          return node.emit('response', { request: request, response: response }, event);
        } else {
          stack.push(response);
          return callback(null, stack);
        }
      });
    }, function (err, stack) {
      if (err) {
        return event.reply(err);
      } else if (stack.length == 0) {
        err = { code: 'NOT_FOUND', message: 'file ' + request.filepath + ' not found' };
        return event.reply(Yolo.Util.wrapError(err));
      } else {
        return node.emit('response', { request: request, response: stack.join('\n') }, event);
      }
    });
  });

  node.on('file-relative-streamable', function (request, event) {
    return event.reply(new Error('not yet implemented'));
  });

  node.on('http-content', function (request, event) {
    return node.send('Adapter.Http.Client:request', request, function (err, response) {
      if (err) return event.reply(err);
      return node.emit('response', { request: request, response: response }, event);
    });
  });

  node.on('http-streamable', function (request, event) {
    return event.reply(new Error('not yet implemented'));
  });

  /***************************************************/

  node.on('url', function (request, event) {
    node.logger.trace('Deprecated :url method, use :request method instead');
    return node.emit('request', request, event);
  });

};

