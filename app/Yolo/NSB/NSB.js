var Bhiv    = require('bhiv');
var parser  = require('./NSB.parser.js');
var path    = require('path');
var async   = require('async');
var NSBU    = require('./NSB.Util.js');

module.exports = function (node) {
  var Bee  = new Bhiv(node.createInvoke(), node.data).Bee;

  var cache = { fqns: {}, scope: {} };

  // fqn -> { fqn, instance }
  node.on('get', new Bee()
          .extract({ fqn: '${.}' })
          .then(':getResource', '${fqn}', { structure: '${.}' })
          .then(':instanciate', '${structure}', { instance: '${.}' })
          .extract({ fqn: '${structure._fqn}', instance: '${instance}' })
          .end()
         );

  // Server.Request -> Server.Response.js
  node.on('http-serve', function (data, event) {
    var fqn = data.params.fqn;
    var params = data.params.params; // ?!?
    node.logger.warn('check rights');
    return node.emit('get', fqn, function (err, result) {
      if (err) return event.reply(err);
      var payload = { fqn: result.fqn, scope: result.scope };
      var body = Yolo.Util.serialize(payload);
      return event.reply(null, { type: 'js', content: body });
    });
  });

  /***************************************/

  // fqn -> structure
  node.on('getResource', function (fqn, event) {
    var usecache = node.get('usecache') !== false;
    if (cache.fqns[fqn] != null && usecache)
      return event.reply(null, cache.scope[cache.fqns[fqn]]);
    return node.emit('produce', fqn, function (err, structure) {
      if (err) return event.reply(err);
      cache.fqns[fqn] = structure._fqn;
      cache.scope[structure._fqn] = structure;
      return event.reply(null, structure);
    });
  });

  // fqn -> structure
  node.on('produce', new Bee()
          .extract({ fqn: '${.}' })
          .then(':fetch', '${fqn}', { source: '${.}' })
          .then(':parse', '${source}', { ast: '${.}' })
          .pipe(':compute')
          .end()
         );

  // fqn -> source
  node.on('fetch', function (fqn, event) {
    var chain = fqn.split('.');
    var basename = chain.pop();
    var filename = basename + '.nsb';
    var filepath = chain.join('/');
    var paths = [];
    toplevel.paths.slice().reverse().map(function (wd) {
      paths.push(path.join(wd, 'app', filepath, basename, filename));
      paths.push(path.join(wd, 'app', filepath, filename));
    });
    return (function loop(list, event) {
      var path = list.shift();
      if (path == null) return event.reply(Yolo.Util.wrapError('Module "' + fqn + '" not found'));
      var request = { path: path, cache: 5 };
      return node.send('Yolo.Util.Retriever:url', request, function (err, content) {
        if (err) return loop(list, event);
        return event.reply(null, content)
      });
    })(paths, event);
  });

  // source -> ast
  node.on('parse', function (source, event) {
    var content = { source: source };
    try { var ast = parser.parse(content.source); }
    catch (e) { return event.reply(Yolo.Util.wrapError(e, content)); }
    return event.reply(null, ast);
  });

  // { fqn, ast } -> structure
  node.on('compute', function (data, event) {
    return (function walk(fqn, ast, callback) {
      return async.map(ast.layouts || [], function (fqn, cb) {
        return node.emit('getResource', fqn, cb);
      }, function (err, layouts) {
        if (err) return callback(err);
        ast.layouts = [];
        for (var i = 0; i < layouts.length; i++) ast.layouts.push(layouts[i]._fqn);
        var payload = { fqn: fqn || null, ast: ast };
        return node.emit('consolidate', payload, function (err, structure) {
          if (err) return callback(err);
          if (structure._fqn == null) Yolo.Node.fqn(structure);
          cache.scope[structure._fqn] = structure;
          return callback(null, structure);
        });
      });
    })(data.fqn, data.ast, event.createCallback());
  });

  // { fqn, ast } -> structure
  node.on('consolidate', function (data, event) {
    var structure = new Yolo.Structure();
    if (data.fqn) Object.defineProperty(structure, '_fqn', { value: data.fqn });
    if (data.ast.tags) structure.tags = data.ast.tags;
    if (data.ast.layouts) structure.layouts = data.ast.layouts;
    return async.map(data.ast.rules || [], function (rule, cb) {
      var payload = { structure: structure, rule: rule };
      var handler = [rule.slot, rule.method].join('-');
      return node.emit(handler, payload, function (err, result) {
        if (err) return cb(err);
        if (result && result.structure != structure) {
          node.logger.debug('Side Effect on', structure, '=>', result.structure);
          structure = result.structure;
        }
        return cb();
      });
    }, function (err) {
      if (err) return event.reply(err);
      return event.reply(null, structure);
    });
  });

  // structure -> instance
  node.on('instanciate', function (structure, event) {
    var fqn = structure._fqn;
    var instance = Yolo.Node.create(fqn, cache.scope);
    return event.reply(null, instance);
  });

  // instance -> scope
  node.on('scope-filter', function (instance, event) {
    var scope = {};
    instance.flatten(function (node) {
      for (var i = 0; i < node.layouts.length; i++) {
        var layout = node.layouts[i];
        if (layout[0] == '$') continue ;
        scope[layout] = cache.scope[layout];
      }
    });
    return event.reply(null, scope);
  });

  /******************/

  node.on('data-set', function (pair, event) {
    if (pair.structure.data == null) pair.structure.data = {};
    var fqn = 'Language.' + pair.rule.type + ':parse';
    return node.send(fqn, pair.rule.value, function (err, value) {
      if (err) return event.reply(err);
      if (value != null && typeof value == 'object' && !(value instanceof Array)) {
        var data = Bhiv.getIn(pair.structure.data, pair.rule.path) || {};
        Yolo.Util.merge(data, value, true);
        Bhiv.setIn(pair.structure.data, pair.rule.path, data);
      } else {
        Bhiv.setIn(pair.structure.data, pair.rule.path, value);
      }
      return event.reply();
    });
  });

  node.on('data-push', function (pair, event) {
    if (pair.structure.data == null) pair.structure.data = {};
    var fqn = 'Language.' + pair.rule.type + ':parse';
    return node.send(fqn, pair.rule.value, function (err, value) {
      if (err) return event.reply(err);
      value = value instanceof Array ? value : [value];
      var data = Yolo.Util.getIn(pair.structure.data, pair.rule.path);
      if (data == null) {
        Yolo.Util.setIn(pair.structure.data, pair.rule.path, value);
      } else if (data instanceof Array) {
        Array.prototype.push.apply(data, value);
      } else {
        Yolo.Util.setIn(pair.structure.data, pair.rule.path, [data].concat(value));
      }
      return event.reply();
    });
  });

  node.on('inlet-add-custom', function (pair, event) {
    if (pair.structure.inlets == null) pair.structure.inlets = {};
    var fqn = 'Language.' + pair.rule.type + ':inlet-create';
    return node.send(fqn, pair.rule.value, function (err, inlet) {
      if (err) return event.reply(err);
      var inlets = pair.structure.inlets[pair.rule.name] || [];
      if (inlets.length == 0) pair.structure.inlets[pair.rule.name] = inlets;
      inlets.push(inlet);
      return event.reply();
    });
  });

  node.on('inlet-add-structure', function (pair, event) {
    if (pair.structure.inlets == null) pair.structure.inlets = {};
    var payload = { ast: pair.rule.structure };
    return node.emit('compute', payload, function (err, structure) {
      if (err) return event.reply(err);
      var inlet = { fqn: structure._fqn, scope: cache.scope };
      inlet.call = function (payload, event) {
        var structure = { data: payload.data, layouts: [this.fqn] };
        // DO NOT ATTACH FQN TO THIS STRUCTURE
        var instance = new Yolo.Node().ingest(structure, this.scope);
        return event.reply(null, instance);
      };
      inlet.serialize = function () {
        return ( [ '{ call: function () { /* TODO */ }'
                 , ', serialize: function () { return Yolo.Util.serialize(this); }'
                 , ', fqn: ' + JSON.stringify(this.fqn)
                 , ', scope: null'
                 , '}'
                 ].join('')
               );
      };
      var inlets = pair.structure.inlets[pair.rule.name] || [];
      if (inlets.length == 0) pair.structure.inlets[pair.rule.name] = inlets;
      inlets.push(inlet);
      return event.reply();
    });
  });

  node.on('child-define', function (pair, event) {
    if (pair.structure.children == null) pair.structure.children = {};
    var data = { ast: pair.rule.structure };
    return node.emit('compute', data, function (err, structure) {
      if (err) return event.reply(err);
      pair.structure.children[pair.rule.name] = structure._fqn;
      return event.reply();
    });
  });

  node.on('rewrite-replace', function (pair, event) {
    var selector = pair.rule.selector;
    return NSBU.replace(cache.scope, pair.structure, selector, function (inherit, callback) {
      var payload = { fqn: null, ast: pair.rule.structure };
      return node.emit('consolidate', payload, function (err, structure) {
        if (err) return callback(err);
        var fqn = Yolo.Node.fqn(structure);
        cache.scope[fqn] = structure;
        return callback(null, fqn);
      });
    }, function (err, structure) {
      if (err) return event.reply(err);
      pair.structure = structure;
      return event.reply(null, pair);
    });
  });

  node.on('rewrite-apply', function (pair, event) {
    var selector = pair.rule.selector;
    return NSBU.replace(cache.scope, pair.structure, selector, function (inherit, callback) {
      var payload = { fqn: null, ast: pair.rule.structure };
      return node.emit('consolidate', payload, function (err, structure) {
        if (err) return callback(err);
        if (!structure.layouts) structure.layouts = [];
        structure.layouts.unshift(inherit._fqn);
        var fqn = Yolo.Node.fqn(structure);
        cache.scope[fqn] = structure;
        return callback(null, fqn);
      });
    }, function (err, structure) {
      if (err) return event.reply(err);
      pair.structure = structure;
      return event.reply(null, pair);
    });
  });

  node.on('custom-fqn', function (pair, event) {
    return node.send(pair.rule.fqn, 'parse-rule', pair, event);
  });

  node.on('layout-add', function (pair, event) {
    if (pair.structure.layouts == null) pair.structure.layouts = [];
    var fqn = pair.rule.fqn;
    var data = toplevel.Config[fqn];
    if (data) {
      var structure = new Yolo.Structure();
      structure.data = data;
      Yolo.Node.fqn(structure, '$');
      pair.structure.layouts.push(structure._fqn);
      return event.reply();
    }
    // TODO
    debugger;
  });

};
