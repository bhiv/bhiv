var Bhiv   = require('bhiv');
var path   = require('path');

module.exports = function (node) {
  var Bee  = new Bhiv(node.createInvoke(), node.data).Bee;

  var libdir       = path.join(toplevel.dirname, 'lib');
  var moddir       = path.join(toplevel.dirname, 'modules');
  var appdir       = path.join(toplevel.dirname, 'app');
  var staticdir    = path.join(toplevel.dirname, 'statics');
  var staticlibdir = path.join(toplevel.dirname, 'statics', 'libraries');
  var nodemoddir   = path.join(toplevel.dirname, 'node_modules');

  var concat = { data: '${data};\n${.}' };

  var waiter = null;
  var cache  = null;

  node.on('configure', function (config, event) {
    cache = new Yolo.Cache(node.get('cache'));
    return event.reply();
  });

  node.on('export', new Bee()
          .trap({ code: 'cache' }, { type: 'js', content: '${error.content}' })
          .pipe(':cache-read')
          .pipe({ data: '' })

          .then(':include', path.join(staticdir, 'helpers', 'workaround.js'), concat)
          .then(':include', path.join(staticdir, 'helpers', 'base64.min.js'), concat)
          .then(':include', path.join(staticdir, 'helpers', 'crypto.js'), concat)

          .then(':include', path.join(staticlibdir, 'jQuery/jquery-1.12.2.js'), concat)
          .then(':include', path.join(staticlibdir, 'jQuery/jquery-placeholder-fallback.js'), concat)
          .then(':include', path.join(staticlibdir, 'JSON/json.js'), concat)
          .then(':include', path.join(staticlibdir, 'Jade/jade.runtime.js'), concat)
          .then(':include', path.join(staticlibdir, 'Moment/moment-2.13.0.js'), concat)

          .then(':include', path.join(__dirname, 'toplevel.js'), concat)
          .then(':include', path.join(nodemoddir, 'bhiv/Bhiv.js'), concat)
          .then(':import', path.join(libdir, 'Yolo.Path.js'),  concat)
          .then(':import', path.join(libdir, 'Yolo.js'), concat)
          .then(':globalize', null, concat)

          .then(':include', path.join(__dirname, '..', 'ClientSide.js'), concat)

          .then(':embed', 'Language.Jade', concat)
          .then(':embed', 'Yolo.Ui.Event', concat)

          .pipe('Language.Javascript:compress', '${data}', { content: '${.}' })
          .pipe(':cache-write')
          .end()
         );

  /**********************************/

  node.on('cache-read', function (query, event) {
    if (cache.has('content')) {
      var msg = new Error();
      msg.code = 'cache';
      msg.content = cache.get('content');
      return event.reply(msg);
    } else if (waiter != null) {
      waiter(function (content) {
        var msg = new Error();
        msg.code = 'cache';
        msg.content = content;
        return event.reply(msg);
      });
    } else if (node.get('cache') != false) {
      waiter = Bhiv.waiter();
      return event.reply();
    } else {
      return event.reply();
    }
  });

  node.on('cache-write', function (result, event) {
    if (node.get('cache') == false) return event.reply(null, result);
    cache.set('content', result.content);
    if (waiter != null) waiter.ready(function (fn) { return fn(result.content); });
    waiter = null;
    return event.reply();
  });

  /**********************************/

  node.on('http-serve', function (payload, event) {
    return node.emit('export', payload, function (err, wrap) {
      if (err) return event.reply('fail', err);
      return event.reply('done', { type: 'js', content: wrap.content });
    });
  });

  node.on('include', function (filepath, event) {
    var request = { path: filepath };
    return node.send('Yolo.Util.Retriever:url', request, event);
  });

  node.on('embed', function (fqn, event) {
    var parts = fqn.split('.');
    var module = parts[parts.length - 1];
    parts.push('Runtime.' + module + '.js');
    var filepath = path.join(moddir, parts.join('/'));
    var mod = require(filepath);
    var serialized = mod.constructor.toString();
    var wrapper =
      [ '(function () {'
      , '  var module = new ' + serialized + ';'
      , '  Yolo.Util.merge(toplevel.runtimes, module);'
      , '})();'
      ].join('\n');
    return event.reply(null, wrapper);
  });

  node.on('import', function (filepath, event) {
    var request = { path: filepath };
    return node.send('Yolo.Util.Retriever:url', request, function (err, content) {
      var name = path.basename(filepath, '.js');
      if (err) return event.reply('fail', err);
      var wrapper =
        [ 'toplevel.register(' + JSON.stringify(name) + ', (function () {'
        , '  var module = { exports: {} };'
        , content
        , '  return module.exports;'
        , '})());'
        ].join('\n');
      return event.reply('done', wrapper);
    });
  });

  node.on('globalize', function (data, event) {
    var code =
      [ 'window.Yolo = require("Yolo")'
      ].join(';');
    return event.reply('done', code);
  });

  return node;
};
