!function () {
  var _require = null;
  if (typeof require != 'undefined') _require = require;

  require = function (path) {
    if (/\.pegjs$/.test(path)) {
      var dirname = getDirName(new Error());
      return require_pegjs([dirname, path].join('/'));
    } else if (_require != null) {
      return _require.apply(this, arguments);
    } else if (/\.js$/.test(path)) {
      var dirname = getDirName(new Error());
      if (/^([a-z0-9\-]+:)?\/\//i.test(path)) return require_js(path, dirname);
      return require_js([dirname, path].join('/'), dirname);
    } else {
      throw new Error('Unable to load: ' + path);
    }
  };

  Yolo = require('../Yolo.js');

  // FIXME: handle multilayer nodes
  // FIXME: create a better logger than console
  Yolo.create = function (roots) {
    if (typeof roots == 'string') roots = [roots];
    if (!(roots instanceof Array)) roots = [];
    roots.push('../..');
    var Root = new Yolo.Node('ClientSide', 'Root');
    Root.require = new Yolo.Loader(Root, function (opts, callback) {
      var fqn = opts.fqn;
      var paths = generateLocations(fqn);
      try {
        roots.map(function (root) {
          paths.map(function (path) {
            try { var module = require(pathJoin(root, path)); }
            catch (e) {
              if (e == 'Module Not Found') return ;
              else throw e;
            }
            throw module;
          });
        });
      } catch (constructor) {
        if (constructor instanceof Error) return callback(constructor);
        return callback(null, function grower() {
          var layout = new Yolo.Node(fqn, fqn.split('.').pop());
          constructor.call(grower, layout, console);
          return layout;
        });
      }
      return callback(null, createNutShell(fqn));
    }, {});
    return Root;
  };

  return Yolo;
  function createNutShell(fqn) {
    return function () {
      return new Yolo.Node(fqn, fqn.split('.').pop());
    };
  }
  function generateLocations(fqn) {
    var filepath = fqn.replace(/\./g, '/');
    var variants = ['.', fqn.split('.').pop()];
    var locations = [];
    var locset = {};
    var froms = ['.'];
    froms.reverse();
    var extensions = ['.js'];
    froms.map(function (from) {
      variants.map(function (variant) {
        extensions.map(function (ext) {
          var built = pathJoin('app', from, filepath, variant) + ext;
          var fqn = pathJoin(from, filepath).replace(/\//g, '.');
          if (locset[built] != null) return ;
          locset[built] = true;
          locations.push(built);
        });
      });
    });
    return locations;
  }
  function pathJoin() {
    return Array.prototype.slice.apply(arguments)
      .filter(function (e) { return e != '.'; })
      .join('/')
      .replace(/^\/+|\/+$/g, '')
      .replace(/([^:])\/\//g, '$1/');
  }
  function getDirName(callStack) {
    var index = 2;
    if (callStack == null) { callStack = new Error(); index += 1; }
    var line = (callStack.stack + '').split(/\r?\n/)[index];
    var match = /at\s+(?:[^:]+\()?(.+):\d+:\d+\)?$/.exec(line);
    if (match == null) throw new Error('Unable to define relative path');
    var filepath = match[1];
    return filepath.substr(0, filepath.lastIndexOf('/'));
  }
  function require_js(path, dirname) {
    if (typeof peg == 'undefined') throw new Error('Peg.Js is required');
    var xhr = getXMLHttpRequest();
    xhr.open('GET', path, false);
    try { xhr.send(null); }
    catch (e) { throw 'Module Not Found'; }
    var content = xhr.responseText.replace(/^\s*export\s+default\s+/m, 'module.exports = ');
    var script = content + '\n//# sourceURL=' + path;
    var module = { exports: {} };
    var params = '__filename, __dirname, require, module, exports';
    try { void (new Function(params, script))(path, dirname, require, module, module.exports); }
    catch (e) {
      var stack = e.stack.split('\n');
      stack[1] = stack[1].replace('<anonymous>', path + ':0');
      e.stack = stack.join('\n');
      throw e;
    }
    return module.exports;
  }
  function require_pegjs(path) {
    if (typeof peg == 'undefined') throw new Error('Peg.Js is required');
    var xhr = getXMLHttpRequest();
    xhr.open('GET', path, false);
    xhr.send(null);
    var grammar = xhr.responseText;
    var parser = peg.generate(grammar);
    return parser;
  }
  function getXMLHttpRequest() {
    var xhr = null;
    if (window.XMLHttpRequest || window.ActiveXObject) {
      if (window.ActiveXObject) {
        try { xhr = new ActiveXObject("Msxml2.XMLHTTP"); }
        catch(e) { xhr = new ActiveXObject("Microsoft.XMLHTTP"); }
      } else {
        xhr = new XMLHttpRequest();
      }
    } else {
      throw new Error("Unable to request file with XMLHTTPRequest");
    }
    return xhr;
  }
}();
