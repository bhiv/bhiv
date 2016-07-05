var Bhiv  = require('bhiv');
var jade  = require('pug');
var path  = require('path');
var async = require('async');

module.exports = function (node) {
  var Bee  = new Bhiv(node.createInvoke(), node.data).Bee;

  var template = null;

  node.on('load-template', function (_, event) {
    var filepath = path.join(__dirname, 'boilerplate.jade');
    try { template = jade.compileFile(filepath, { globals: ['toplevel'] }); }
    catch (e) { return event.reply('fail', Yolo.Util.wrapError(e)); }
    return event.reply();
  });

  node.on('http-response', new Bee()
          .then(function () { return { debug: { startRespondingAt: new Date().getTime() } }; })
          .then( 'Yolo.Util.Retriever:request'
               , { filepath: '${boilerplate}', first: true, cache: 60
                 , parser: 'Language.Json:parse'
                 }
               , { boilerplate: '${.}' }
               )
          .then({ body: { http: '${http}' } })
          .then(':compute', '${body}', { body: '${.}' })
          .then('Yolo.NSB:scope-filter', '${body.instance}', { body: { scope: '${.}' } })
          .then(':page-compute', null, { content: '${.}' })
          .pipe(':response-format')
          .end()
         );

  node.on('compute', function (request, event) {
    return node.send('Yolo.NSB:get', request.fqn, function (err, payload) {
      if (err) return event.reply(err);
      payload.params = {};
      for (var key in request.params) payload.params[key] = request.params[key];
      if (request.http != null) payload.params._http = request.http;
      if (request.override) {
        var structure = new Yolo.Structure();
        structure.data = request.override;
        var _fqn = Yolo.Node.fqn(structure);
        payload.instance = payload.instance.inflate(_fqn, structure);
      }
      return node.emit('execute', payload, event);
    });
  });

  node.on('execute', function (payload, event) {
    var params = payload.params;
    return payload.instance.mapreduce
    ( function (instance, data, cb) {
      if (data == null) data = {};
      if (data.children == null) data.children = {};
      if (data.styles == null) data.styles = {};
      var result = { html: null, styles: data.styles };
      return instance.emit('init', payload.params, function (err) {
        if (err) return cb(err);
        if (instance.get('discard')) return cb(null, result);
        var view = { instance: instance, params: payload.params, children: data.children }
        return instance.emit('html', view, new function () {
          var handler = this;
          this.fail = cb;
          this.end = function (html) {
            result.html = typeof html == 'string' ? html : '';
            return node.emit('resolve-css', view, function (err, css) {
              if (err) return cb(err);
              handler.styles(css);
              return cb(null, result);
            });
          };
          this.styles = function (css) {
            for (var layout in css) {
              if (layout in result.styles) continue ;
              if (css[layout] == null) continue ;
              result.styles[layout] = css[layout];
            }
          };
        });
      });
    }, function (children) {
      var result = { children: {}, styles: {} };
      for (var child in children) {
        result.children[child] = children[child].html;
        Yolo.Util.merge(result.styles, children[child].styles);
      }
      return result;
    }, function (err, result) {
      if (err) return event.reply(err);
      result.instance = payload.instance;
      return event.reply(null, result);
    });
  });

  node.on('resolve-css', function (payload, event) {
    var instance = payload.instance;
    var params = payload.params;
    var styles = {};
    for (var elder = instance; elder != null; elder = elder.elder) {
      if (elder.data.style == null) continue ;
      if (elder.layout == null) elder.layout = elder.id;
      var css = [];
      var style = elder.data.style;
      if (!(style instanceof Array)) style = [style];
      for (var i = 0; i < style.length; i++) {
        if (style[i] == null) continue ;
        css.push(style[i].call(params));
      }
      var classThis = '.' + Yolo.Util.slugify(elder.layout);
      var value = css.join('').replace(/\.this/g, classThis);
      styles[elder.layout] = { value: value };
    }
    return event.reply(null, styles);
  });

  node.on('page-compute', function compute(webpage, event) {
    if (template == null) {
      return node.emit('load-template', null, function (err) {
        if (err) return event.reply('fail', err);
        else return compute(webpage, event);
      });
    } else {
      var snapshot = webpage.body.instance.snapshot(webpage.body.scope);
      var scope = Yolo.Util.serialize(webpage.body.scope, true, function (data) {
        if (data == null) return data;
        if (typeof data != 'object') return data;
        if (data.template != true) return data;
        if (typeof data.source != 'string') return data;
        var nData = Yolo.Util.copy(data);
        nData.source = Bhiv.extract(data.source, webpage.body.params);
        return nData;
      });
      var script =
        [ '~(' + Yolo.Util.onReady.toString() + ').call(this, function () {'
        , '  toplevel.Root.attach(new Yolo.Node("UI")'
        , '    .register(' + scope + ')'
        , '    .inflate(' + JSON.stringify(webpage.body.instance.layout) + ')'
        , '    .restore(' + JSON.stringify(snapshot) + ')'
        , '    .spread("dom")'
        , '  , "UI", true);'
        , '});'
        ].join('\n');
      webpage.body.script = script;
      return node.emit('webpage-resolve-resources', webpage, function (err, webpage) {
        if (err) return event.reply('fail', err);
        var startAt = webpage.debug.startRespondingAt;
        var renderDuration = new Date().getTime() - startAt;
        Yolo.Util.merge(webpage.debug, { render: { duration: renderDuration + 'ms' } });
        if (webpage.boilerplate == null) webpage.boilerplate = {};
        return event.reply('done', template(webpage));
      });
    }
  });

  node.on('webpage-resolve-resources', function (webpage, event) {
    var tasks = [];
    if (webpage.boilerplate) {
      if (webpage.boilerplate.scripts) {
        for (var i = 0; i < webpage.boilerplate.scripts.length; i++) {
          var item = webpage.boilerplate.scripts[i];
          if (item.fqn) {
            tasks.push({ path: 'boilerplate.scripts.' + i, item: item });
          }
        }
        for (var i = 0; i < webpage.boilerplate.styles.length; i++) {
          var item = webpage.boilerplate.styles[i];
          if (item.fqn) {
            tasks.push({ path: 'boilerplate.styles.' + i, item: item });
          }
        }
      }
    }
    return async.map(tasks, function (task, callback) {
      return node.send(task.item.fqn, task.item.data, function (err, resource) {
        if (err) return callback(err);
        if (task.item.format) resource = Bhiv.extract(task.item.format, resource);
        Bhiv.setIn(webpage, task.path, resource);
        return callback();
      });
    }, function (err) {
      if (err) return event.reply('fail', err);
      return event.reply('done', webpage);
    });
  });

  node.on('response-format', function (webpage, event) {
    var code = 200;
    var headers = {};
    var content = new Buffer(webpage.content);
    headers['Content-Type'] = 'text/html';
    headers['Content-Length'] = content.length;
    headers['X-Powered-By'] = 'Yolo.Builder';
    return event.reply('done', { code: code, headers: headers, body: content });
  });

  return node;
};
