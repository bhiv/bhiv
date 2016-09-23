var Url    = require('url');
var fs     = require('fs');
var path   = require('path');
var async  = require('async');

module.exports = function (node, logger) {

  var cache = new Yolo.Cache(10);

  /*************************************************/

  node.on('request', function (request, flux) {
    if (typeof request == 'string') request = Url.parse(request);
    if (request.protocol == null) request.protocol = 'file:';
    var method = flux.has('data') ? 'streamable' : 'content';
    if (request.cache) request.cache_key = Yolo.Digest(request);
    if (method == 'content' && request.cache_key != null) {
      if (cache.has(request.cache_key)) return flux(null, cache.get(request.cache_key));
      throw new Error('fix me');
      var count = cache.queue(request.cache_key, flux);
      if (count > 1) return ;
    }
    logger.log('Retrieving %s', Url.format(request));
    switch (request.protocol) {
    case 'file:':
      var fp = request.path || request.filepath || request.url;
      request.filepath = fp;
      if (fp[0] == '/') {
        return this.node.send(':file-absolute-' + method, request, flux);
      } else {
        return this.node.send(':file-relative-' + method, request, flux);
      }
    case 'http:': case 'https:':
      return this.node.send(':http-' + method, request, flux);
    default:
      return flux(new Error('Protocol not yet implemented'));
    }
  });

  node.on('response', function (payload, callback) {
    if (payload.request.parser) {
      return this.node.send(payload.request.parser, payload.response, (err, content) => {
        if (err) return cache.error(payload.request.cache_key, err);
        payload.response = content;
        return this.node.send(':response-cache', payload, callback);
      });
    } else {
      return this.node.send(':response-cache', payload, callback);
    }
  });

  node.on('response-cache', function (payload, callback) {
    var key = payload.request.cache_key;
    if (key == null) return callback(null, payload.response);
    cache.set(key, payload.response, payload.request.cache > 0 ? payload.request.cache : Infinity);
    return ;
  });

  /**************************************************/

  node.on('file-absolute-content', function (request, callback) {
    return fs.readFile(request.filepath, (err, buffer) => {
      if (err) return callback(err);
      var response = buffer.toString();
      return this.node.send(':response', { request, response }, callback);
    });
  });

  node.on('file-absolute-streamable', function (request, callback) {
    return callback(new Error('not yet implemented'));
  });

  node.on('file-relative-content', function (request, callback) {
    var directories = toplevel.paths.slice().reverse();
    var files = directories.map(dir => path.join(dir, request.filepath));
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
    return async.reduce(tries, [], (stack, filepath, cb) => {
      return fs.readFile(filepath, (err, buffer) => {
        if (err) return cb(null, stack);
        var response = buffer.toString();
        if (request.first) {
          return this.node.send(':response', { request, response }, callback);
        } else {
          stack.push(response);
          return cb(null, stack);
        }
      });
    }, (err, stack) => {
      if (err) {
        return callback(err);
      } else if (stack.length == 0) {
        err = { code: 'NOT_FOUND', message: 'file ' + request.filepath + ' not found' };
        return callback(Yolo.Util.wrapError(err));
      } else {
        return this.node.send(':response', { request, response: stack.join('\n') }, callback);
      }
    });
  });

  node.on('file-relative-streamable', function (request, callback) {
    return callback(new Error('not yet implemented'));
  });

  node.on('http-content', function (request, callback) {
    return this.node.send('Adapter.Http.Client:request', request, (err, response) => {
      if (err) return callback(err);
      return this.node.send(':response', { request, response }, callback);
    });
  });

  node.on('http-streamable', function (request, callback) {
    return callback(new Error('not yet implemented'));
  });

  /***************************************************/

  node.on('url', function (request, callback) {
    logger.trace('Deprecated :url method, use :request method instead');
    return this.node.send(':request', request, callback);
  });

};

