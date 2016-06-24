var express      = require('express');
var bodyParser   = require('body-parser');
var formidable   = require('formidable');
var cookieParser = require('cookie-parser');
var mime         = require('mime');
var fs           = require('fs');
var url          = require('url');

module.exports = function (node) {
  var middlewares = [];
  var responders = {};

  var createServer = function (ip, port) {
    var app = express();
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(cookieParser());
    app.use(executeMiddleware);
    node.logger.info('Listening on %s:%s', ip, port);
    app.listen(port, ip);
    app.on('error', function (err) {
      node.logger.error(err);
    });
    Object.defineProperty(app.settings, 'ip', { value: ip });
    Object.defineProperty(app.settings, 'port', { value: port });
    app.settings['x-powered-by'] = 'YoloJS';
    return app;
  };

  var createHandler = function (data, source, event) {
    node.logger.info('%s Routing [%s] %s %s', source, data.outlet, data.method, data.location);
    return function (request, response) {
      node.logger.info('[%s] %s %s', data.outlet, request.method, request.url);
      var http = { request: request, response: response, config: data };
      var payload = request.payload || {};
      payload.http    = http;
      payload.url     = request.url;
      payload.headers = request.headers;
      payload.params  = request.params;
      payload.query   = url.parse(request.url, true).query;
      payload.cookies = request.cookies;
      payload.session = request.session;
      payload.body    = null;
      payload.files   = null;
      var contentType = (request.headers['content-type'] || '').split(';')[0] || 'none';
      switch (contentType) {
      default :
        payload.message = 'Unknown / Unhandled content type:' + contentType;
        return event.reply('route-fail', payload);
      case 'none':
        return event.reply('request', payload);
      case 'application/x-www-form-urlencoded':
      case 'application/json':
        payload.body = request.body;
        return event.reply('request', payload);
      case 'multipart/form-data':
        var opts = node.get('Formidable') || {};
        var form = new formidable.IncomingForm(opts);
        return form.parse(request, function (err, fields, files) {
          payload.body  = fields;
          payload.files = files;
          return event.reply('request', payload);
        });
      }
    };
  };

  var executeMiddleware = function (request, response, next) {
    return (function loop(fns) {
      if (fns.length == 0) return next();
      else return fns.shift()(request, response, function () { loop(fns); });
    })(middlewares.slice());
  };

  node.on('middleware-add', function (fqn, event) {
    middlewares.push(function (request, response, callback) {
      node.send(fqn, { request: request, response: response }, callback);
    });
    return event.reply();
  });

  node.on('responder-add', function (description, event) {
    responders[description.type] = description.handler;
    return event.reply();
  });

  node.on('get-server', function (data, event) {
    var ip = Yolo.Util.getIn(data, 'config.ip') || node.get('ip') || '0.0.0.0';
    var port = Yolo.Util.getIn(data, 'config.port') || node.get('port') || 80;
    var name = [ip, port].join(':');
    var key = Yolo.Digest(name);
    var server = node.get('servers.' + key);
    if (server == null) {
      try { server = createServer(ip, port); }
      catch (e) { return event.reply(e); }
      node.set('servers.' + key, server);
    }
    return event.reply(null, server);
  });

  node.on('handle-query', function (data, event) {
    return node.emit('get-server', data, function (err, server) {
      if (err) return event.reply(err);
      for (var i = 0; i < data.methods.length; i++) {
        var method = data.methods[i].toLowerCase();
        data.method = method;
        var name = server.settings.ip + ':' + server.settings.port;
        server[method](data.location, createHandler(data, name, event));
      }
      return event.reply();
    });
  });

  node.on('handle-middleware', function (data, event) {
    return node.emit('get-server', data, function (err, server) {
      if (err) return event.reply(err);
      server.use(function (request, response, next) {
        var payload = { request: request, response: response };
        if (request.payload == null) request.payload = {};
        return node.send(data.fqn, payload, new function () {
          this.end = function () {
            /* Nothing to do */
          };
          this.done = function (payload) {
            Yolo.Util.merge(request.payload, payload);
            return next();
          };
          this.fail = function (error) {
            response.end('failed');
            /* TODO: may be responde something */
            return node.logger.error(error);
          };
        });
      });
      return event.reply();
    });
  });

  node.on('response', function (payload, event) {
    var then = function (err, result) {
      if (err) {
        var message = err.toString();
        node.logger.error(err);
        var data = { _response: payload.http.response, message: message };
        return node.emit('response-error', data, event);
      } else {
        if (result == null) return event.reply();
        debugger;
        payload.http.response.writeHead(result.code, result.headers);
        payload.http.response.end(result.body);
        return event.reply();
      }
    };
    if (payload.output) {
      if (payload.output.type in responders) {
        return node.send(responders[payload.output.type], payload.output, then);
      } else {
        var handler;
        switch (payload.output.type) {
        case undefined: case null: handler = 'response-empty'; break ;
        case 'json': handler = 'response-json'; break ;
        case 'json-response': handler = 'response-json-response'; break ;
        case 'html': handler = 'response-html'; break ;
        case 'css': handler = 'response-css'; break ;
        case 'js': case 'javascript': handler = 'response-javascript'; break ;
        case 'plain': case 'txt': case 'text': handler = 'response-plain'; break ;
        case 'file': handler = 'response-file'; break ;
        case 'redirect': case 'location': handler = 'response-redirect'; break ;
        default: handler = 'response-unknown'; break ;
        }
        payload.output._response = payload.http.response;
        return node.emit(handler, payload.output, then);
      }
    } else {
      return node.emit('response-unknown', payload.output, then);
    }
  });

  node.on('response-empty', function (_, event) {
    return event.reply('done', { code: 204, headers: {}, body: new Buffer('') });
  });

  node.on('response-redirect', function (output, event) {
    return event.reply('done', { code: output.code || 303
                               , headers: { 'Location': output.location }
                               , body: new Buffer('')
                               });
  });

  node.on('response-plain', function (output, event) {
    var code = output.code || 200;
    var headers = {};
    headers['Content-Type'] = 'text/plain; charset=UTF-8';
    var body = new Buffer(output.content);
    headers['Content-Length'] = body.length;
    return event.reply('done', { code: code, headers: headers, body: body });
  });

  node.on('response-json-response', function (output, event) {
    var headers = {};
    Yolo.Util.merge(headers, output.headers || {});
    headers['Content-Type'] = 'application/json; charset=UTF-8';
    if (output.error != null) {
      var message = Yolo.Util.wrapError(output.error).message;
      var result = { status: 'error', code: output.code || 400, message: message };
    } else {
      var result = { status: 'ok', code: output.code || 200, data: output.content || output.success };
    }
    var body = new Buffer(JSON.stringify(result));
    headers['Content-Length'] = body.length;
    var code = parseInt(result.code)
    if (!(code > 0)) code = result.status == 'ok' ? 200 : 400;
    return event.reply('done', { code: code, headers: headers, body: body });
  });

  node.on('response-json', function (output, event) {
    var code = output.code || 200;
    var headers = {};
    Yolo.Util.merge(headers, output.headers || {});
    headers['Content-Type'] = 'application/json; charset=UTF-8';
    var body = new Buffer(JSON.stringify(output.content));
    headers['Content-Length'] = body.length;
    return event.reply('done', { code: code, headers: headers, body: body });
  });

  node.on('response-css', function (output, event) {
    var code = output.code || 200;
    var headers = {};
    Yolo.Util.merge(headers, output.headers || {});
    headers['Content-Type'] = 'text/css';
    var body = new Buffer(output.content);
    headers['Content-Length'] = body.length;
    return event.reply('done', { code: code, headers: headers, body: body });
  });

  node.on('response-javascript', function (output, event) {
    var code = output.code || 200;
    var headers = {};
    Yolo.Util.merge(headers, output.headers || {});
    headers['Content-Type'] = 'application/javascript; charset=utf-8';
    var body = new Buffer(output.content);
    headers['Content-Length'] = body.length;
    return event.reply('done', { code: code, headers: headers, body: body });
  });

  node.on('response-file', function (output, event) {
    var code = output.code || 200;
    var body = fs.createReadStream(output.filepath);
    body.on('error', function (err) {
      return node.emit('response-notfound', output, event);
    });
    body.on('start', function () {
      var contentType = mime.lookup(output.filepath);
      var headers = { 'Content-Type': contentType }
      output._response.writeHead(code, headers);
    });
    body.on('data', function (chunk) {
      output._response.write(chunk);
    });
    body.on('end', function () {
      output._response.end();
      return event.reply('end', null);
    });
  });

  node.on('response-notfound', function (output, event) {
    output._response.writeHead(404);
    output._response.end(output.message || 'Content Not Found');
    return event.reply('end', null);
  });

  node.on('response-error', function (output, event) {
    output._response.writeHead(500);
    output._response.end(output.message || 'Internal Error');
    return event.reply('end', null);
  });

  return node;
};

