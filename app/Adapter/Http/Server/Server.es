var express      = require('express');
var bodyParser   = require('body-parser');
var formidable   = require('formidable');
var cookieParser = require('cookie-parser');
import mime from 'mime';
import fs from 'fs';
import url from 'url';
import async from 'async';
import S from 'underscore.string';

module.exports = function (node, logger) {
  var responders = {};

  var createHandler = function (data, source, flux) {
    logger.info('%s Routing [%s] %s %s', source, data.outlet, data.method, data.location);
    return function (request, response) {
      logger.log('[%s] %s %s', data.outlet, request.method, request.url);
      const onode = node.newest();
      const http = { request, response, config: data };
      const payload = request.payload || {};
      payload.http    = http;
      payload.scope   = generateScope(onode.cwd(), data.location, data.method);
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
        return triggerRequest(onode, payload, flux);
      case 'none':
        return triggerRequest(onode, payload, flux);
      case 'application/x-www-form-urlencoded':
      case 'application/json':
        payload.body = request.body;
        return triggerRequest(onode, payload, flux);
      case 'multipart/form-data':
        var opts = node.get('Formidable') || {};
        var form = new formidable.IncomingForm(opts);
        return form.parse(request, function (err, fields, files) {
          payload.body  = fields;
          payload.files = files;
          return triggerRequest(onode, payload, flux);
        });
      }
    };
  };

  var triggerRequest = function (node, payload, flux) {
    if (payload.http.request.middlewares == null)
      return flux.emit('request', payload);
    return (function loop(middlewares, payload, flux) {
      if (middlewares.length == 0) return flux.emit('request', payload);
      const fqn = middlewares.shift();
      return node.send(fqn, payload, new function () {
        this.done = function (payload) {
          return loop(middlewares, payload, flux);
        };
        this.fail = function (error) {
          payload.response.end('failed');
          return logger.error(error);
        };
      });
    })(payload.http.request.middlewares.slice(), payload, flux);
  };

  var generateScope = function (fqn, location, method) {
    const scopes = [];
    const parts = location.substr(1).split('/').map(function (s) {
      switch (s.charAt(0)) {
      case ':': return '{' + s.substr(1) + '}';
      default: return S.classify(s);
      }
    });
    const frags = []
    for (let i = 0; i < parts.length; i++) {
      const left = parts[i - 1];
      const right = parts[i];
      if (left == null) {
        frags.push(right);
      } else if (right.charAt(0) == '{') {
        frags.push('(', right);
      } else if (left.charAt(0) == '{') {
        if (right.charAt(0) == '{') {
          frags.push(',', right);
        } else {
          frags.push(').', right);
        }
      } else {
        frags.push('.', right);
      }
    }
    const path = frags.join('');
    return fqn + '.Path(' + path + '):' + method.toLowerCase();
  }

  var executeMiddleware = function (request, response, next) {
    response.setHeader('X-Powered-By', 'YoloJS');
    return next();
  };

  node.on('-load', function (slice, callback) {
    var responders = node.get('responders');
    var types = Object.keys(responders || {}) || [];
    return async.map(types, (type, callback) => {
      return this.node.send(':responder-add', { type, handler: responders[type] }, callback);
    }, err => {
      return this.super(slice, callback);
    });
  });

  node.on('responder-add', function (description, callback) {
    responders[description.type] = description.handler;
    return callback(null, description);
  });

  node.on('create-server', function ({ ip, port }) {
    var app = express();
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(cookieParser());
    app.use(executeMiddleware);
    logger.info('Listening on %s:%s', ip, port);
    app.listen(port, ip);
    app.on('error', function (err) {
      logger.error(err);
    });
    Object.defineProperty(app.settings, 'ip', { value: ip });
    Object.defineProperty(app.settings, 'port', { value: port });
    app.settings['x-powered-by'] = 'YoloJS';
    return app;
  });

  node.on('get-server', function (data, callback) {
    var ip = Yolo.Util.getIn(data, 'config.ip')
      || Yolo.Util.getIn(data, 'config.listen')
      || this.node.get('ip')
      || this.node.get('listen')
      || '0.0.0.0';
    var port = Yolo.Util.getIn(data, 'config.port') || this.node.get('port') || 80;
    var name = [ip, port].join(':');
    var key = Yolo.Digest(name);
    var server = this.node.get('servers.' + key);
    if (server == null) {
      return this.node.emit('create-server', { ip, port }, (err, server) => {
        if (err) return callback(err);
        this.node.set('servers.' + key, server);
        return callback(null, server);
      });
    } else {
      return callback(null, server);
    }
  });

  node.on('handle-middleware', function (data, callback) {
    var exceptions = { request: true, response: true };
    return this.node.send(':get-server', data, (err, server) => {
      if (err) return callback(err);
      server.use((request, response, next) => {
        if (request.middlewares == null) request.middlewares = [];
        request.middlewares.push(data.fqn);
        return next();
      });
      return callback(null, data);
    });
  });

  node.on('handle-query', function (data, callback) {
    return this.node.send(':get-server', data, (err, server) => {
      if (err) return callback(err);
      for (var i = 0; i < data.methods.length; i++) {
        var method = data.methods[i].toLowerCase();
        data.method = method;
        var name = server.settings.ip + ':' + server.settings.port;
        server[method](data.location, createHandler(data, name, callback));
      }
      return callback(null, data);
    });
  });

  node.on('response', function (payload, flux) {
    var then = function (err, result) {
      if (err) {
        var message = err.toString();
        logger.error(err);
        var data = { _response: payload.http.response, message };
        return node.send(':response-error', data, flux);
      } else {
        if (result == null) return flux(null, null);
        payload.http.response.writeHead(result.code, result.headers);
        payload.http.response.end(result.body);
        return flux(null, null);
      }
    };
    if (payload.output) {
      if (payload.output.type in responders) {
        return node.send(responders[payload.output.type], payload.output, then);
      } else {
        var handler;
        switch (payload.output.type) {
        case 'empty': case undefined: case null: handler = ':response-empty'; break ;
        case 'json': handler = ':response-json'; break ;
        case 'json-response': handler = ':response-json-response'; break ;
        case 'html': handler = ':response-html'; break ;
        case 'css': handler = ':response-css'; break ;
        case 'js': case 'javascript': handler = ':response-javascript'; break ;
        case 'plain': case 'txt': case 'text': handler = ':response-plain'; break ;
        case 'file': handler = ':response-file'; break ;
        case 'redirect': case 'location': handler = ':response-redirect'; break ;
        case 'proxy': handler = ':response-proxypass'; break ;
        default: handler = ':response-unknown'; break ;
        }
        payload.output._response = payload.http.response;
        return node.send(handler, payload.output, then);
      }
    } else {
      return node.send(':response-unknown', payload.output, then);
    }
  });

  node.on('response-empty', function (output, callback) {
    return callback(null, { code: output.code || 204
                          , headers: output.headers || {}
                          , body: new Buffer('')
                          }
                   );
  });

  node.on('response-redirect', function (output, callback) {
    return callback(null, { code: output.code || 303
                          , headers: { 'Location': output.location }
                          , body: new Buffer('')
                          });
  });

  node.on('response-plain', function (output, callback) {
    var code = output.code || 200;
    var headers = {};
    headers['Content-Type'] = 'text/plain; charset=UTF-8';
    var body = new Buffer(output.content);
    headers['Content-Length'] = body.length;
    return callback(null, { code, headers, body });
  });

  node.on('response-json-response', function (output, callback) {
    var headers = {};
    Yolo.Util.merge(headers, output.headers || {});
    headers['Content-Type'] = 'application/json; charset=UTF-8';
    if (output.error != null) {
      var message = Yolo.Util.wrapError(output.error).message;
      var result = { status: 'error', code: output.code || 400, message };
    } else {
      var result = { status: 'ok', code: output.code || 200, data: output.content || output.success };
    }
    var body = new Buffer(JSON.stringify(result));
    headers['Content-Length'] = body.length;
    var code = parseInt(result.code)
    if (!(code > 0)) code = result.status == 'ok' ? 200 : 400;
    return callback(null, { code, headers, body });
  });

  node.on('response-html', function (output, callback) {
    var code = output.code || 200;
    var headers = {};
    var body = output.content;
    Yolo.Util.merge(headers, output.headers || {});
    headers['Content-Type'] = 'text/html; charset=UTF-8';
    headers['Content-Length'] = body.length;
    return callback(null, { code, headers, body });
  });

  node.on('response-json', function (output, callback) {
    const code = output.code || 200;
    const headers = {};
    const data = output.content || output.data;
    Yolo.Util.merge(headers, output.headers || {});
    headers['Content-Type'] = 'application/json; charset=UTF-8';
    const body = new Buffer(JSON.stringify(data) || '');
    headers['Content-Length'] = body.length;
    return callback(null, { code, headers, body });
  });

  node.on('response-css', function (output, callback) {
    var code = output.code || 200;
    var headers = {};
    Yolo.Util.merge(headers, output.headers || {});
    headers['Content-Type'] = 'text/css';
    var body = new Buffer(output.content);
    headers['Content-Length'] = body.length;
    return callback(null, { code, headers, body });
  });

  node.on('response-javascript', function (output, callback) {
    var code = output.code || 200;
    var headers = {};
    Yolo.Util.merge(headers, output.headers || {});
    headers['Content-Type'] = 'application/javascript; charset=utf-8';
    var body = new Buffer(output.content);
    headers['Content-Length'] = body.length;
    return callback(null, { code, headers, body });
  });

  node.on('response-file', function (output, flux) {
    var code = output.code || 200;
    var body = fs.createReadStream(output.filepath);
    body.on('error', (err) => {
      return this.node.send(':response-notfound', output, flux);
    });
    body.on('start', () => {
      var contentType = mime.lookup(output.filepath);
      var headers = { 'Content-Type': contentType }
      output._response.writeHead(code, headers);
    });
    body.on('data', (chunk) => {
      output._response.write(chunk);
    });
    body.on('end', () => {
      output._response.end();
      return flux.emit('success', null);
    });
  });

  node.on('response-proxypass', function (output, flux) {
    const payload = { method: output.method || 'get'
                    , url: output.url
                    , headers: output.headers || null
                    , authorization: output.authorization || null
                    , data: output.data || null
                    };
    const runtime = this;
    return this.send('Adapter.Http.Client:request', payload, new function () {
      this.head = function (head) {
        for (var key in head.headers)
          output._response.setHeader(key, head.headers[key]);
      };
      this.data = function (chunk) { output._response.write(chunk); };
      this.success = function () { output._response.end(); };
      this.fail = function (err) { runtime.log('error', err); };
    });
  });

  node.on('response-notfound', function (output, flux) {
    output._response.writeHead(404);
    output._response.end(output.message || 'Content Not Found');
    return flux.emit('success', null);
  });

  node.on('response-error', function (output, flux) {
    output._response.writeHead(500);
    output._response.end(output.message || 'Internal Error');
    return flux.emit('success', null);
  });

};

