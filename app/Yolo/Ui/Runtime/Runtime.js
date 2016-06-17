var Bhiv   = require('bhiv');
var path   = require('path');

module.exports = function (node) {
  var Bee  = new Bhiv(node.createInvoke(), node.data).Bee;

  var libdir       = path.join(toplevel.dirname, 'lib');
  var appdir       = path.join(toplevel.dirname, 'app');

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

          .then(':include-customs')

          .then(':include', path.join(__dirname, 'toplevel.js'), concat)
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
    return node.send('Yolo.Util.Retriever:request', request, event);
  });

  node.on('include-customs', function (flow, event) {
    return (function loop(files, accu) {
      if (files.length == 0) return event.reply(null, { data: accu });
      var file = files.shift();
      var request = { filepath: file, first: true }
      return node.send('Yolo.Util.Retriever:request', request, function (err, content) {
        if (err) node.logger.warn(err);
        return loop(files, accu + ';' + (content || ''));
      });
    })((node.get('includes') || []).slice(), flow.data);
  });

  node.on('embed', function (fqn, event) {
    var parts = fqn.split('.');
    var module = parts[parts.length - 1];
    parts.push('Runtime.' + module + '.js');
    var filepath = path.join(appdir, parts.join('/'));
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
    return node.send('Yolo.Util.Retriever:request', request, function (err, content) {
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
