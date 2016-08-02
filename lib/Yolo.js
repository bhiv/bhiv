/**
 * Author: npelletier at wivora dot fr
 *
 * ROADMAP:
 *  Node:
 *    Inlet: gestion sync, lazy
 */

module.exports = new function Yolo() {
  'use strict';
  var Yolo = this;

  this.noop = function () {};

  this.Util = new function () {

    this.id = (function constructor() {
      var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      var fn = function (l) {
        var list = [];
        for (var i = 0; i < l; i++)
          list.push(chars[(Math.random() * chars.length) | 0]);
        return list.join('');
      };
      fn.toString = function () { return '(' + constructor + ')()'; };
      return fn;
    })();

    this.onReady = function (fn) {
      if (this.Yolo != null) return this.Yolo.Util.defer(fn);
      if (typeof this.YoloOnReady == 'undefined') this.YoloOnReady = [fn];
      else this.YoloOnReady.push(fn);
    };

    this.getIn = function (source, path) {
      if (path === '.') return source;
      if (source instanceof Object) {
        if (typeof path === 'string') {
          var chain = path.split('.');
          for (var i = 0, l = chain.length, node = source; i < l; ++i) {
            if (node == null) break ;
            node = node[chain[i]];
          }
          if (i == l && node != null) return node;
        } else if (path in source) {
          return source[path];
        }
      }
      return null;
    };

    this.setIn = function (target, path, value) {
      var chain = ('' + path).split('.');
      while (chain.length > 0) {
        if (chain.length == 1) {
          target[chain.shift()] = value;
        } else if (target.hasOwnProperty(chain[0]) && target[chain[0]] instanceof Object) {
          target = target[chain.shift()];
        } else {
          target = target[chain[0]] = target[chain[0]] ? Object.create(target[chain[0]]) : {};
          chain.shift();
        }
      }
      return value;
    };

    this.serialize = function serialize(data, skipempty, iterator) {
      if (typeof iterator == 'function') data = iterator(data);
      switch (Object.prototype.toString.call(data)) {
      case '[object Array]':
      case '[object Arguments]':
        var result = [];
        for (var i = 0; i < data.length; i++) {
          var value = serialize(data[i], skipempty, iterator);
          if (value == null && skipempty) continue ;
          result.push(value);
        }
        if (result.length < 1 && skipempty) return 'null';
        return '[' + result.join(',') + ']';
      case '[object RegExp]':
        return [ '/', (data.source == '' ? '(?:)' : data.source), '/'
               , data.global ? 'g' : ''
               , data.ignoreCase ? 'i' : ''
               , data.multiline ? 'm' : ''
               ].join('');
      case '[object Date]':
        return '(new Date(' + serialize(data.getTime(), skipempty, iterator) + '))';
      case '[object Function]':
        return '(' + data.toString() + ')';
      case '[object Object]':
        if (typeof data.serialize == 'function')
          return data.serialize(iterator);

        var temp = {};
        var order = [];
        for (var i in data) {
          var value = serialize(data[i], skipempty, iterator);
          if (value == null) continue ;
          order.push(i);
          temp[i] = value;
        }
        order.sort();
        var result = [];
        for (var i = 0; i < order.length; i++)
          result.push(serialize(order[i], skipempty, iterator) + ':' + temp[order[i]]);
        if (result.length < 1 && skipempty) return 'null';
        return '{' + result.join(',') + '}';
      case '[object Number]':
      case '[object Boolean]':
        return data.toString();
      case '[object String]':
        if (data == '' && skipempty) return 'null';
        return JSON.stringify(data);
      case '[object Null]':
        return 'null';
      case '[object Undefined]':
        return skipempty ? 'null' : Object.prototype.toString.call(data);
      default:
        return serialize(Object.prototype.toString.call(data), skipempty, iterator);
      }
    };

    this.merge = function merge(holder, alpha, replaceArray) {
      switch (Object.prototype.toString.call(alpha)) {
      case '[object Array]': case '[object Arguments]':
        if (holder instanceof Array && !replaceArray) {
          for (var i = 0; i < alpha.length; i++)
            holder.push(alpha[i]);
        } else if (holder && typeof holder == 'object') {
          for (var i = 0; i < alpha.length; i++) {
            if (typeof holder[i] == 'object')
              merge(holder[i], alpha[i], replaceArray);
            else
              holder[i] = Yolo.Util.copy(alpha[i]);
          }
        }
        return holder;
      case '[object Object]':
        if (holder && typeof holder == 'object')
          for (var i in alpha) {
            if (holder[i] != null && typeof holder[i] == 'object')
              merge(holder[i], alpha[i], replaceArray);
            else
              holder[i] = Yolo.Util.copy(alpha[i]);
          }
        return holder;
      default:
        return holder;
      }
    };

    this.copy = function copy(data) {
      switch (Object.prototype.toString.call(data)) {
      case '[object Array]': case '[object Arguments]':
        var result = new Array(data.length);
        for (var i = 0; i < data.length; i++) result[i] = copy(data[i]);
        return result;
      case '[object Object]':
        if (data.constructor !== Object) return data;
        var result = {};
        for (var i in data) result[i] = copy(data[i]);
        return result;
      case '[object RegExp]':
        return new RegExp( data.source
                         , [ data.global ? 'g' : ''
                           , data.ignoreCase ? 'i' : ''
                           , data.multiline ? 'm' : ''
                           ].join('')
                         );
      case '[object Date]':
        return new Date(data.getTime());
      case '[object Number]':
      case '[object String]':
      case '[object Boolean]':
      case '[object Function]':
        return data;
      case '[object Undefined]':
      case '[object Null]':
        return null;

      }
    };

    this.walk2 = function walk2(left, right, iterator, path) {
      if (path == null) path = [];
      iterator(path, left, right);
      switch (Object.prototype.toString.call(left)) {
      case '[object Object]':
        if (left.constructor !== Object) return ;
        var done = {};
        right = right && typeof right == 'object' ? right : null;
        for (var key in left) {
          done[key] = true;
          walk2(left[key], right ? right[key] : null, iterator, path.concat(key));
        }
        if (right == null || right.constructor !== Object) return ;
        for (var key in right) {
          if (key in done) continue ;
          walk2(null, right[key], iterator, path.concat(key));
        }
        break ;
      case '[object Array]':
        if (!(right instanceof Array)) right = [];
        for (var i = 0, l = Math.max(left.length, right.length); i < l; i++)
          walk2(left[i], right[i], iterator, path.concat(i));
      default:
        return ;
      }
    };

    this.slugify = (function constructor() {
      var from = '', to = [];
      var chars =
        { a: '\xe0\xe1\xe2\xe3\xe4\xe5\xe6\u0103\u0105'
        , e: '\xe8\xe9\xeb\xea\u0119'
        , i: '\xec\xed\xee\xef'
        , o: '\xf2\xf3\xf4\xf5\xf6\xf8'
        , u: '\xf9\xfa\xfb\xfc'
        , n: '\xf1\u0144'
        , c: '\xe7\u0107'
        , l: '\u0142'
        , s: '\u015b\u0219'
        , t: '\u021b'
        , z: '\u017a\u017c'
        , '-pound-': '\xa3'
        , '-dollar-': '\x24'
        , '-euro-': '\u20ac'
        , '-yen-': '\xa5'
        , '-and-': '&'
        , '-at-': '@'
        };
      for (var c in chars)
        for (var i = 0; i < chars[c].length; i++) {
          from += chars[c].charAt(i);
          to.push(c);
        }
      var rxp = new RegExp('[' + from + ']', 'g');
      var r1 = /[^a-z0-9]+/g, r2 = /^-+|-+$/g, r0 = /([a-z0-9])([A-Z])/g
      var modifier = function (c) { return to[from.indexOf(c)]; };
      var fn = function (str) {
        if (str == null) return '';
        return String(str)
          .replace(r0, '$1-$2')
          .toLowerCase()
          .replace(rxp, modifier)
          .replace(r1, '-').replace(r2, '');
      };
      fn.toString = function () { return '(' + constructor + ')()'; };
      return fn;
    })();

    this.Path = require('./Yolo.Path.js');

    this.wrapError = function (e, content) {
      debugger;
      if (!(e instanceof Error)) {
        if (e && /error/i.test(e.constructor.name)) {
          var err = new Error(e.message);
          for (var key in e) err[key] = e[key];
        } else {
          if (typeof e == 'string') {
            if (/^Error:.+\n\s*at\s/.test(e)) {
              e = { message: e.substr(7, e.indexOf('\n'))
                  , stack: e
                  };
            } else {
              e = { message: e };
            }
          } else if (e && e.message == null) {
            if (e.code != null) e.message = 'Error: ' + e.code;
            else e = { message: Yolo.Util.serialize(e) };
          }
          var err = new Error(e.message);
          if (e.code != null) err.code = e.code;
          if (e.stack != null) err.stack = e.stack;
          else if (e.error != null && /^\w+$/i.test(e.error)) e.code = e.error;
          if (content != null) err.source = content.source || content;
          return err;
        }
      }
      if (e.loc != null && e.loc.line > 0) {
        e.location = { start: e.loc };
      } else if (e.line > 0) {
        e.location = { start: { line: e.line, column: (e.column || e.col) | 0 } };
      } else if (e.location == null && /line\s+\d+/.test(e.message)) {
        var location = /line\s+(\d+)(:\d+)?/.exec(e.message);
        e.location = { start: { line: location[1] | 0, column: location[2] | 0, skip: true } };
      }
      if (content != null) {
        var source = typeof content == 'string' ? content : content.source;
        e.source = source;
        if (e.location) {
          var line      = e.location.start.line;
          var column    = e.location.start.column;
          var extract   = source.split('\n').slice(Math.max(0, line - 4), line);
          (extract[extract.length - 1] || '').replace(/\t/g, ' ');
          if (e.location.start.skip) {
            var position  = '';
          } else {
            var strpos    = 'Line: ' + line + ' Column: ' + column;
            var position  = new Array(column | 0).join('-') + '^ ' + strpos;
          }
          var addendum  = '\n' + extract.join('\n') + '\n' + position;
          var stack = e.stack || e.message;
          e.stack = stack.replace(e.message, e.message + addendum);
          e.message += addendum;
        } else {
          e.message += '\nFrom content:\n' + source;
        }
      }
      return e;
    };

    this.defer = (function () {
      var _setImmediate = typeof setImmediate === 'function' && setImmediate;
      var _delay = _setImmediate
        ? function (fn) { _setImmediate(fn); }
        : function (fn) { setTimeout(fn, 0); }
      ;
      return function (fn) {
        if (arguments.length > 1) {
          var args = Array.prototype.slice.call(arguments, 1);
          return _delay(function () { fn.apply(this, args); });
        } else {
          return _delay(fn);
        }
      };
    })();
  };

  /** Digest */
  this.Digest = function Digest(data) {
    if (!(this instanceof Digest))
      return new Digest().update(data).toString();
    this.buffer = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    this.m1     = 42;
    this.m2     = 2843;
    this.offset = 0;
  };

  this.Digest.prototype.update = function (data) {
    var content = typeof data == 'string' ? data : Yolo.Util.serialize(data, true);
    if (content == null) content = 'null';
    var offset = this.offset;
    var m1 = this.m1, m2 = this.m2;
    main: for (var i = 0; i < content.length; i += 16)
      for (var o = 0; o < 16; o++, offset = (offset + 1) % 16) {
        if (i + o >= content.length) break main;
        var char = content.charCodeAt(i + o);
        m1 = (m1 + (char + offset) * m2) % 1031;
        m2 = (m2 + m1 ^ 0x55555555) % 2179;
        this.buffer[offset] = (m1 + char + this.buffer[offset]) % 256;
      }
    this.offset = offset;
    this.m1 = m1;
    this.m2 = m2;
    return this;
  };

  this.Digest.prototype.toString = function () {
    var output = [];
    for (var o = 0; o < 16; o++) {
      var hex = this.buffer[o].toString(16);
      output[o] = hex.length > 1 ? hex : '0' + hex;
    }
    return output.join('');
  };

  /** Cache */
  this.Cache = function (expire) {
    this._tick     = null;
    this._nextTick = null;
    this._map      = {};
    this._expire   = expire < 0 ? Infinity : (expire * 1000);
  };

  this.Cache.prototype.has = function (key) {
    var item = this._map[key];
    if (!item) return false;
    if (item.expire > new Date().getTime()) return true;
    this.gc();
    return false;
  };

  this.Cache.prototype.get = function (key) {
    var item = this._map[key];
    if (item) return item.data;
    return null;
  };

  this.Cache.prototype.set = function (key, data, expire) {
    var date = new Date().getTime() + ((expire * 1000) || this._expire);
    if (this._map[key] == null) this._map[key] = {};
    var cache = this._map[key];
    cache.expire = date;
    cache.data = data;
    if (cache.queue)
      while (cache.queue.length > 0)
        cache.queue.shift()(data);
    if (date > this._nextTick) return ;
    this.gc();
  };

  this.Cache.prototype.queue = function (key, fn) {
    if (this._map[key] == null) this._map[key] = {};
    var cache = this._map[key];
    if ('data' in cache) return fn(cache.data), 0;
    if (cache.queue == null) cache.queue = [];
    cache.queue.push(fn);
    return cache.queue.length;
  };

  this.Cache.prototype.remove = function (key) {
    if (!this.has(key)) return ;
    this._map[key].expire = 0;
    this.gc();
  };

  this.Cache.prototype.flush = function () {
    this._map = {};
    this.gc();
  };

  this.Cache.prototype.gc = function () {
    var now = new Date().getTime();
    var nextTick = Infinity;
    var map = {};
    for (var key in this._map) {
      var item = this._map[key];
      if (item.expire <= now) continue ;
      if (item.expire < nextTick) nextTick = item.expire;
      map[key] = item;
    }
    this._map = map;
    if (nextTick == this._nextTick) return ;
    this._nextTick = nextTick;
    if (this._tick) {
      clearTimeout(this._tick);
      this._tick = null;
    }
    if (nextTick == Infinity) return ;
    this._tick = setTimeout(function (cache) {
      cache._tick = null;
      cache.gc();
    }, (nextTick - now) + 1, this);
  };

  /** Ring */
  this.Ring = function (head, tail) {
    this.head = head || null;
    this.tail = tail || null;
  };

  this.Ring.prototype.toArray = function () {
    var list = [];
    for (var cursor = this; cursor != null; cursor = cursor.tail)
      list.push(cursor.head);
    return list;
  };

  this.Ring.prototype.fold = function (fn, accu) {
    for (var cursor = this; cursor != null; cursor = cursor.tail)
      accu = fn(cursor.head);
    return accu;
  };

  this.Ring.prototype.foldAsync = function (fn, accu, callback) {
    var tail = this.tail;
    if (tail != null) {
      return fn(this.head, accu, function (err, accu) {
        if (err) return callback(err);
        else return tail.fold(fn, accu, callback);
      });
    } else {
      return fn(this.head, accu, callback);
    }
  };

  this.Ring.prototype.set = function (identity) {
    for (var cursor = this; cursor != null; cursor = cursor.tail)
      if (cursor.head === identity)
        return this;
    return new Yolo.Ring(identity, this);
  };

  this.Ring.prototype.indexOf = function (identity) {
    var index = 0;
    for (var cursor = this; cursor != null; cursor = cursor.tail)
      if (cursor.head === identity)
        return index;
    return -1;
  };

  this.Ring.prototype.remove = function (identity) {
    if (this.head === identity) return this.tail;
    for (var cursor = this; true; cursor = cursor.tail) {
      if (cursor.tail == null) return this;
      if (cursor.tail.head != identity) continue ;
      cursor.tail = cursor.tail.tail;
      return this;
    }
  };

  this.Ring.prototype.without = function (identity) {
    var list = this.toList();
    var previous = null;
    while (list.length > 0) {
      var element = list.pop();
      if (identity === element) continue ;
      previous = new Yolo.Ring(element, previous);
    }
    return previous;
  };

  /** Type */

  this.Type = function (fqn) {
    if (!/^[A-Z]\w+(\.[A-Z]\w+)*$/.test(fqn)) throw new Error('Bad Type name');

    this.fqn = fqn;
  };

  /** Event */
  this.Event = function (name, path, ref) {
    this.name     = name;
    if (typeof path == 'string') path = Yolo.Util.Path.parse(path) || null;
    this.forward  = path instanceof Array ? path.slice() : [];
    this.history  = {};
    this.payload  = ref && ref.payload != null ? ref.payload : null;
    this.type     = 'inlet';
    this.replier  = this.replier(ref && (ref.callback || ref.replier));
    var self      = this;
    Array.prototype.slice.call(arguments, 2).map(function (o) {
      if (o.type) self.type = o.type;
      if (o.from) self.from = o.from;
    });
  };

  this.Event.create = function (name, callback, payload) {
    return new this(name, null, { callback: callback, payload: payload });
  };

  this.Event.History = function (node) {
    this.done = {};
    this.flowing = node.flowing;
    this.kept = null;
    this.required = false;
  };

  this.Event.prototype.replier = function (replier) {
    switch (typeof replier) {
    case 'function': return new function () {
      this.done = function (payload) {
        return replier(null, payload);
      };
      this.fail = function (error) {
        if (!(error instanceof Error)) error = Yolo.Util.wrapError(error);
        return replier(error);
      };
    };
    case 'object': return replier;
    default: return null;
    }
  };

  this.Event.prototype.createCallback = function (wrapError) {
    var event = this;
    wrapError = !!wrapError;
    return function (err, data) {
      if (err) {
        if (wrapError) err = Yolo.Util.wrapError(err);
        return event.reply(err);
      } else {
        return event.reply(null, data);
      }
    };
  };

  this.Event.prototype.reply = function (name, payload) {
    if (this.replier == null) return ;
    switch (arguments.length) {
    case 0:
      var fn = this.replier.done || this.replier.end;
      return fn.call(this, this.payload);
    case 1:
      return this.replier.fail(name);
    case 2:
      switch (name) {
      case 'done': case null:
        var fn = this.replier.done || this.replier.end;
        return fn.call(this, payload);
      case 'end':
        var fn = this.replier.end || this.replier.done;
        this.replier.end = this.replier.done = this.replier.fail = null;
        return fn.call(this, payload);
      case 'fail':
        var fn = this.replier.fail || console.error.bind(console);
        this.replier.end = this.replier.done = this.replier.fail = null;
        return fn.call(this, payload);
      default:
        if (typeof this.replier[name] == 'function') {
          return this.replier[name].call(this, payload);
        } else {
          return /* drop event silently */;
        }
      }
    }
  };

  this.Event.prototype.getFqn = function () {
    var path = [];
    for (var i = 0; i < this.forward.length; i++)
      path.push(this.forward[i].name);
    return path.join('.');
  };

  /** Structure */

  this.Structure = function Structure() {};

  /** Node */
  this.Node = function Node(layout, name, tags) {
    this.id       = Yolo.Util.id(8);
    this.layout   = layout || null;
    this.name     = name   || null;
    this.tags     = tags   || [];

    this.data     = {};
    this.model    = {};
    this.inlets   = {};
    this.outlets  = {};

    this.scope    = {};
    this.parent   = null;
    this.elder    = null;
    this.children = {};
    this.flowing  = null;
  };

  this.Node.create = function (layout, scope) {
    if (layout instanceof Yolo.Structure) {
      var structure = layout;
      layout = structure._fqn;
      if (layout == null) layout = Yolo.Node.fqn(structure);
      if (scope == null) {
        scope = {};
        scope[layout] = structure;
      }
    }
    var node = new Yolo.Node(layout);
    if (scope != null) {
      node.scope = scope;
      if (scope[layout] != null) node.ingest(scope[layout], scope);
    }
    return node;
  };

  this.Node.fqn = function (structure, prefix) {
    if (prefix == null) prefix = '_';
    if (structure == null) return prefix + '.' + Yolo.Util.id(16);
    var longhash = Yolo.Digest(structure);
    var offset = /[a-z]/.exec(longhash).index;
    if (!(offset >= 0)) { longhash = 'z' + longhash; offset = 0; }
    var hash = longhash.substr(offset, 10);
    if (hash.length < 10) hash += longhash.substr(0, 10 - hash.length);
    var fqn = prefix + '.' + hash;
    Object.defineProperty(structure, '_fqn', { value: fqn });
    return fqn;
  };

  /********************************/

  this.Node.prototype.register = function () {
    if (arguments.length == 1) {
      if (arguments[0] instanceof Object) {
        var scope = arguments[0];
        for (var fqn in scope) this.register(fqn, scope[fqn]);
      } else {
        throw new Error('Unhandled prototype call')
      }
    } else if (arguments.length == 2) {
      var structure = arguments[1];
      if (structure instanceof Object) {
        var definition = arguments[1];
        if (definition instanceof Yolo.Structure) {
          var structure = definition;
        } else {
          var structure = new Yolo.Structure();
          for (var key in definition) structure[key] = definition[key];
        }
        this.scope[arguments[0]] = structure;
      }
    } else {
      throw new Error('Unhandled prototype call')
    }
    return this;
  };

  this.Node.prototype.requireSync = function (fqn) {
    for (var node = this; node != null; node = node.parent) {
      var structure = node.scope[fqn];
      if (structure != null) return structure;
    }
    return null;
  };

  this.Node.prototype.inflate = function (fqn, structure, scope) {
    if (!structure && scope) structure = scope[fqn];
    if (!structure) structure = this.requireSync(fqn);
    if (!structure) throw new Error('Unable to load: ' + fqn);
    if (!scope) scope = this.scope;
    scope[fqn] = structure;
    var elder = this;
    var parent = this.parent;
    for (var i = (structure.layouts || []).length - 1; i >= 0; i--)
      elder = elder.inflate(structure.layouts[i], null, scope);
    var instance = Yolo.Node.create(fqn, scope);
    instance.parent = parent;
    instance.elder = elder;
    elder.parent = instance;
    instance.emit('load', instance);
    return instance;
  };

  this.Node.prototype.ingest = function (structure, scope) {
    if (scope == null) scope = this.scope;
    if (structure.tags)
      for (var i = 0; i < structure.tags.length; i++)
        this.tags.push(structure.tags[i]);
    for (var hasData in structure.data) break ;
    if (hasData != null) {
      Yolo.Util.merge(this.data, structure.data);
    } else if (structure.data != null) {
      this.data = structure.data;
    } else {
      structure.data = this.data;
    }
    for (var name in structure.inlets) {
      var inlets = structure.inlets[name];
      for (var i = 0; i < inlets.length; i++) {
        var inlet = inlets[i];
        if (typeof inlet == 'string' && scope[inlet])
          this.on(name, scope[inlet]);
        else
          this.on(name, inlet);
      }
    }
    for (var name in structure.children) {
      var child = null;
      var layout = structure.children[name];
      if (typeof layout == 'string') {
        child = scope[layout];
        if (child == null) child = this.requireSync(layout);
      }
      if (typeof child != 'object') continue ;
      if (!(child instanceof Yolo.Node))
        child = new Yolo.Node(layout).ingest(child, scope);
      this.attach(child, name);
    }
    if (structure.layouts instanceof Array) {
      var inferior = this;
      for (var i = 0; i < structure.layouts.length; i++) {
        var child = Yolo.Node.create(structure.layouts[i], scope);
        child.parent = inferior;
        inferior.elder = child;
        inferior = child
        while (inferior.elder != null)
          inferior = inferior.elder;
      }
    }
    return this;
  };

  /********************************************/

  this.Node.prototype.snapshot = function (scope, isRuntime) {
    if (scope == null) scope = {};
    var snapshot = { id: this.id };
    if (isRuntime && this.layout != null) snapshot.layout = this.layout;
    for (var node = this; node != null; node = node.elder) {
      if (node.layout == null) {
        snapshot.data = Yolo.Util.copy(node.data);
        for (var elder = node; elder; elder = node.elder) {
          if (elder.layout == null) continue ;
          snapshot.layout = elder.layout;
          break ;
        }
      } else {
        Yolo.Util.walk2(node.data, scope[node.layout].data, function (chain, left, right) {
          if (right == left || right != null) return ;
          if (snapshot.data == null) snapshot.data = {};
          var target = snapshot.data;
          while (chain.length > 0) {
            if (chain.length == 1) {
              target[chain.shift()] = left;
            } else if (target[chain[0]] instanceof Object) {
              target = target[chain.shift()];
            } else {
              target = target[chain.shift()] = {};
            }
          }
        });
      }
      for (var name in node.children) {
        if (snapshot.children == null) snapshot.children = {};
        if (name in snapshot.children) continue ;
        var structure = scope[node.layout];
        var ischildRuntime = false;
        if (structure == null || structure.children == null || structure.children[name] == null)
          ischildRuntime = true;
        snapshot.children[name] = node.children[name].snapshot(scope, ischildRuntime);
      }
    }
    return snapshot;
  };

  this.Node.prototype.restore = function (snapshot) {
    if (snapshot.data != null) Yolo.Util.merge(this.data, snapshot.data);
    if (snapshot.layout) this.parent.attach(this.inflate(snapshot.layout), this.name);
    var node = this.self();
    if (snapshot.id != null) node.id = snapshot.id;
    for (var name in snapshot.children) {
      var child = node.getChild(name);
      if (child == null) {
        child = new Yolo.Node();
        node.attach(child, name);
      }
      child.restore(snapshot.children[name]);
    }
    return node;
  };

  /****************************/

  this.Node.prototype.inspect = function (iterator) {
    var top = this.self();
    var elder = this;
    while (elder.elder != null) elder = elder.elder;
    while (elder != null) {
      iterator(elder);
      if (elder == top) break ;
      elder = elder.parent;
    }
  };

  this.Node.prototype.flatten = function (iterator) {
    var flat =
      { id: null, name: null, layouts: [], tags: []
      , data: this.get('.'), inlets: {}, children: {}
      };

    this.inspect(function (elder) {

      if (elder.id != null) flat.id = elder.id;
      if (elder.name != null) flat.name = elder.name;
      if (elder.layout != null) flat.layouts.push(elder.layout);

      if (elder.tags != null)
        for (var i = 0; i < elder.tags.length; i++)
          if (!~flat.tags.indexOf(elder.tags[i]))
            flat.tags.push(elder.tags[i]);

      for (var name in elder.inlets) {
        if (flat.inlets[name] == null) flat.inlets[name] = [];
        flat.inlets[name].push(elder.inlets[name]);
      }

      for (var name in elder.children) {
        if (flat.children[name] != null) continue ;
        flat.children[name] = elder.children[name].flatten(iterator);
      }

    });

    if (typeof iterator == 'function') flat = iterator(flat);
    return flat;
  };

  /**********************/

  this.Node.prototype.createInvoke = function () {
    var node = this;
    return function (fqn, callback) {
      return callback(null, function (data, callback) {
        return node.send(fqn, data, callback);
      });
    };
  };

  /**********************/

  this.Node.prototype.cwd = function () {
    var path = [], self = this.self();
    while (self.parent != null && self.require == null) {
      path.unshift(self.name);
      self = self.parent;
    }
    return path.join('.');
  };

  this.Node.prototype.isParentOf = function (child) {
    while (child.parent) {
      if (child.parent == this)
        return true;
      else
        child = child.parent;
    }
    return false;
  };

  this.Node.prototype.match = function (selection) {
    if (selection.tags == null) return true;
    for (var i = 0; i < selection.tags.length; i++)
      if (!~this.tags.indexOf(selection.tags[i]))
        return false;
    return true;
  };

  this.Node.prototype.filter = function (selection) {
    return this.match(selection) ? this : null;
  };

  /*********************/

  this.Node.prototype.setRouter = function (router) {
    var originalGive = Yolo.Node.prototype._give;
    this._give = function (event) {
      if (this.parent == null) return originalGive.call(this, event);
      var parentId = this.parent.id;
      var parentHistory = event.history[parentId];
      if (parentHistory == null) return originalGive.call(this, event);
      if (parentHistory.done[this.name] != true) return originalGive.call(this, event);
      return router.call(this, event, originalGive);
    };
  };

  this.Node.prototype.isRouter = function () {
    return this.hasOwnProperty('_give');
  };

  this.Node.prototype.setLoader = function (loader) {

  };

  /*********************/

  this.Node.prototype.get = function (path) {
    if (path == null || path == '.') {
      var data = {};
      for (var i = 0, layers = this.getLayers().reverse(); i < layers.length; i++)
        (function walk(tree, accu) {
          switch (Object.prototype.toString.call(tree)) {
          case '[object Array]':
            var result = new Array(tree.length);
            for (var key = 0; key < tree.length; key++)
              result[key] = walk(tree[key], result[key]);
            return result;
          case '[object Object]':
            if (tree.constructor == null || tree.constructor == Object) {
              var result = accu || {};
              for (var key in tree)
                result[key] = walk(tree[key], result[key]);
              return result;
            } else {
              return tree;
            }
          default:
            return tree;
          }
        })(layers[i].data, data);
      return data;
    } else {
      var chain = ('' + path).split('.');
      elder: for (var node = this; node != null; node = node.elder) {
        for (var i = 0, l = chain.length, obj = node.data; i < l; ++i) {
          obj = obj[chain[i]];
          if (obj == null) continue elder;
        }
        return obj;
      }
    }
    return null;
  };

  this.Node.prototype.set = function (path, value) {
    var chain = ('' + path).split('.');
    var data = this.data;
    while (chain.length > 0) {
      if (chain.length == 1) {
        data[chain.shift()] = value;
      } else if (data[chain[0]] instanceof Object) {
        data = data[chain.shift()];
      } else {
        data = data[chain.shift()] = {};
      }
    }
    return this;
  };

  this.Node.prototype.push = function (path, value) {
    var chain = ('' + path).split('.');
    var data = this.data;
    while (chain.length > 0) {
      if (chain.length == 1) {
        var key = chain.shift();
        if (data[key] != null) {
          if (!(data[key] instanceof Array)) data[key] = [data[key]];
          var method = value instanceof Array ? 'apply' : 'call';
          Array.prototype.push[method](data[key], value);
        } else {
          data[key] = value;
        }
      } else if (data[chain[0]] instanceof Object) {
        data = data[chain.shift()];
      } else {
        data[chain.shift()] = {};
      }
    }
    return this;
  };

  /*********************/

  this.Node.prototype.kind = function (kind) {
    if (arguments.length == 0) {
      return this.model.kind || null;
    } else {
      switch (kind) {
      case 'Primitive': break ;
      case 'Record': this.model.fields = {}; break ;
      case 'Collection': this.model.element = null; break ;
      default: throw new Error('Only "Primitive", "Record", "Collection" is allowed');
      }
    }
    this.model.kind = kind;
    return this;
  };

  this.Node.prototype.inherit = function (fqn) {
    if (arguments.length == 0) return this.model.inherits || [];
    if (this.model.inherits == null) this.model.inherits = [];
    this.model.inherits.push(fqn);
    return this;
  };

  this.Node.prototype.field = function (name, type) {
    if (this.kind() != 'Record') throw new Error('This node kind must be a Record');
    if (arguments.length < 2) return this.model.fields[name] || null;
    if (typeof type == 'string') type = new Yolo.Type(type);
    this.model.fields[name] = type;
    return this;
  };

  this.Node.prototype.type = function (type) {
    if (this.kind() != 'Collection') throw new Error('This node kind must be a Collection');
    if (arguments.length == 0) return this.model.type || null;
    if (typeof type == 'string') type = new Yolo.Type(type);
    this.model.type = type;
    return this;
  };

  this.Node.prototype.check = function (name, priority, predicate) {
    if (this.model.checks == null) this.model.checks = {};
    if (arguments.length == 1) { predicate = name; name = 'default'; priority = 'default'; }
    else if (arguments.length == 2) { predicate = priority; priority = 'default'; }
    if (typeof predicate != 'function') throw new Error('Need a function to check');
    if (this.model.checks[priority] == null) this.model.checks[priority] = [];
    this.model.checks[priority].push({ name: name, predicate: predicate });
    return this;
  };

  this.Node.prototype.fix = function (name, patch) {
    if (this.model.fixes == null) this.model.fixes = {};
    if (arguments.length == 1) { patch = name; name = 'default'; }
    if (typeof patch != 'function') throw new Error('Need a function to fix');
    if (this.model.fixes[name] == null) this.model.fixes[name] = [];
    this.model.fixes[name].push(patch);
    return this;
  };

  /*********************/

  this.Node.prototype.on = function (name, direction, inlet) {
    if (arguments.length == 2) { inlet = direction; direction = 'out' };
    if (this.inlets[name] == null) this.inlets[name] = { _in: null, _out: null };
    if (typeof inlet == 'function') inlet = { call: inlet };
    this.inlets[name]['_' + direction] = inlet;
  };

  this.Node.prototype.emit = function (name, payload, event) {
    if (arguments.length == 1 && name instanceof Yolo.Event) {
      event = name;
      payload = event.payload;
      name = event.name;
    } else if (!(event instanceof Yolo.Event)) {
      event = Yolo.Event.create('callback', event);
    }
    var inlets = { _in: [], _out: [] };
    for (var elder = this; elder != null; elder = elder.elder) {
      var inlet = elder.inlets[name];
      if (inlet == null) continue ;
      if (inlet._in != null) inlets._in.push(inlet._in);
      if (inlet._out != null) inlets._out.unshift(inlet._out);
    }
    inlets = inlets._in.concat(inlets._out);
    var node = this;
    if (inlets.length == 0) return event.reply('end', payload);
    return (function walk(inlets, payload) {
      var inlet = inlets.shift();
      var ns = Object.create(inlet, { node: { value: node } });
      var replier = Object.create(event.replier);
      replier.end = function (payload) {
        return event.reply('end', payload);
      };
      replier.done = function (payload) {
        return inlets.length > 0 ? walk(inlets, payload) : event.reply('done', payload);
      };
      replier.fail = function (error) {
        event.error = error;
        return event.reply('fail', error);
      };
      var then = Yolo.Event.create(name, replier, payload);
      return inlet.call.call(ns, payload, then);
    })(inlets, payload);
  };

  this.Node.prototype.spread = function (event, payload, callback) {
    return this.mapreduce(function (node, _, callback) {
      node.emit(event, payload, callback);
    }, null, callback);
  };

  this.Node.prototype.hasInlet = function (name) {
    for (var elder = this.self(); elder != null; elder = elder.elder) {
      if (!(name in elder.inlets)) continue ;
      if (elder.inlets[name].length < 1) continue ;
      return true;
    }
    return false;
  };

  /****************************/

  this.Node.prototype.setFlowing = function (name, isFlowing) {
    this.flowing = this.flowing != null ? (
      isFlowing ? this.flowing.set(name) : this.flowing.remove(name)
    ) : (
      isFlowing ? new Yolo.Ring(name) : null
    );
    return this;
  };

  /****************************/

  this.Node.prototype.self = function () {
    var self = this;
    while (self.parent != null) {
      if (self.parent.elder != self) return self;
      self = self.parent;
    }
    return self;
  };

  this.Node.prototype.getLayers = function () {
    var layers = [];
    for (var node = this.self(); node != null; node = node.elder)
      layers.push(node);
    return layers;
  };

  this.Node.prototype.setElder = function (elder) {
    this.elder = elder;
    elder.parent = this;
    return this;
  };

  this.Node.prototype.setParent = function (parent) {
    for (var node = this.self(); node != null; node = node.elder)
      node.parent = parent;
    return this;
  };

  this.Node.prototype.getChild = function (path) {
    var level = this.self();
    path.split('.').map(function (name) {
      for (var node = level; node != null; node = node.elder) {
        var child = node.children[name];
        if (!(child instanceof Yolo.Node)) continue ;
        level = child;
        return ;
      }
      level = null;
    });
    return level;
  };

  this.Node.prototype.select = function (fqn) {
    var offset = fqn.indexOf('.');
    if (offset > 0) {
      var child = this.children[fqn.substr(0, offset)];
      if (child == null) return null;
      return child.select(fqn.substr(0, offset + 1));
    } else {
      return this.getChild(fqn);
    }
  };

  this.Node.prototype.drill = function (qn) {
    var offset = qn.indexOf('.');
    var name = offset > 0 ? qn.substr(0, offset) : qn;
    if (this.children[name] == null) {
      var child = new Yolo.Node();
      child.name = name;
      child.setParent(this);
      this.children[name] = child;
    } else {
      var child = this.children[name];
    }
    if (offset > 0) return child.drill(qn.substr(offset + 1));
    return child;
  };

  this.Node.prototype.attach = function (child, name, flowing) {
    if (child.parent != null && child.parent != this) child.detach();
    if (name == null && child.name != null) name = child.name;
    if (name == null) throw new Error('Missing name');
    var older, offset = name.lastIndexOf('.');
    if (offset > 0) {
      var qn = name.substr(0, offset);
      this.drill(qn, flowing).attach(child, name.substr(offset + 1), flowing);
    } else {
      var older = this.select(name)
      if (older != null) older.detach();
      child.name = name;
      child.parent = this;
      this.children[name] = child;
      this.setFlowing(name, !!flowing);
    }
    return this;
  };

  this.Node.prototype.detachChild = function (name, reference) {
    for (var node = this.self(); node != null; node = node.elder) {
      var child = node.children[name];
      if (child == null) continue ;
      if (reference != null && child != reference) continue ;
      node.children[name] = null;
      child.emit('detached');
    }
    return this;
  };

  this.Node.prototype.detach = function () {
    if (this.parent == null) return this;
    this.parent.detachChild(this.name, this);
    return this;
  };

  this.Node.prototype.empty = function () {
    var node = this;
    this.getChildren().map(function (child) { node.detach(child.name); });
    return this;
  };

  this.Node.prototype.getChildren = function () {
    var list = [];
    for (var node = this.self(); node != null; node = node.elder)
      for (var name in node.children)
        list.unshift(node.children[name]);
    return list;
  };

  this.Node.prototype.getChildrenNames = function () {
    var map = {};
    var names = [];
    for (var node = this.self(); node != null; node = node.elder) {
      for (var name in node.children) {
        if (map[name]) continue ;
        map[name] = true;
        names.unshift(name);
      }
    }
    return names;
  };

  this.Node.prototype.mapreduce = function (map, reduce, callback) {
    var results = {};
    var fail = false;
    var names = this.getChildrenNames();
    var remaining = names.length;
    if (!(remaining > 0)) return map(this, null, callback);
    (function loop(names, node) {
      var name = names.shift();
      var child = node.getChild(name);
      child.mapreduce(map, reduce, function (err, result) {
        if (fail) return ;
        if (err) {
          fail = true;
          if (callback != null) return callback(err);
          throw err;
        } else {
          remaining -= 1;
          results[name] = result;
          if (remaining == 0)
            return map(node, reduce && reduce(results) || results, callback);
        }
      });
      if (names.length > 0) return Yolo.Util.defer(loop, names, node);
    })(names, this);
    return this;
  };

  /**************************/

  this.Node.prototype.create = function (fqn, as, callback) {
    if (arguments.length == 2 && typeof as == 'function') {
      callback = as;
      as = null;
    }
    if (typeof callback != 'function') callback = Yolo.noop;
    var node = this;
    var payload = { real: null, virtual: null, fqn: fqn, as: as };
    if (this.parent != null) {
      payload.real = this.layout;
      payload.virtual = this.cwd();
    }
    var then = function (err, result) {
      if (err) return callback(err);
      if (result.as != null) as = result.as;
      if (as != null) {
        if (result.trunk != node || result.branch == null) node.attach(result.leaf, as);
        else result.trunk.attach(result.branch);
      }
      return result.leaf.emit('load', result, function (err, response) {
        if (err) {
          return callback(err);
        } else if (response == null || !(response.leaf instanceof Yolo.Node)) {
          return callback(null, result);
        } else {
          return callback(null, response);
        }
      });
    };
    var evt = new Yolo.Event('create', 'Root', { type: 'command', payload: payload, callback: then });
    return this._give(evt);
  };

  this.Node.prototype.send = function (path, inlet, payload, callback) {
    if (arguments.length < 4) {
      callback = payload;
      payload = inlet;
      inlet = path.substr(path.indexOf(':') + 1);
      path = path.substr(0, path.indexOf(':'));
    }
    if (callback instanceof Yolo.Event) callback = callback.createCallback();
    var evt = new Yolo.Event( inlet, path || null
                            , { type: 'inlet', payload: payload, callback: callback }
                            );
    return this._give(evt);
  };

  /***************************/

  this.Node.prototype._give = function (event) {
    if (event.forward.length == 0)
      return this._dispatch(event);
    if (event.history[this.id] == null)
      event.history[this.id] = new Yolo.Event.History(this);
    var history = event.history[this.id];
    if (history.kept != null) {
      event.forward.unshift(history.kept);
      history.kept = null;
    }
    var step = event.forward[0];
    var child = null;
    if (step.name == this.name) {
    //if (this.parent == null && step.name == 'Root') {
      child = this;
    } else {
      child = this.getChild(step.name);
    }
    if (child) child = child.filter(step);
    if (child && history.done[step.name] == null) {
      history.done[step.name] = true;
      history.kept = event.forward.shift();
      return child._give(event);
    }
    var flowing = history.flowing;
    while (flowing != null && this.children[flowing.head] == null)
      flowing = flowing.tail;
    if (flowing != null) {
      var child = this.children[flowing.head];
      history.flowing = flowing.tail;
      history.done[child.name] = true;
      return child._give(event);
    }
    if (this.require != null && history.required == false) {
      history.required = true;
      return this._require(event);
    } else if (this.parent != null) {
      return this.parent._give(event);
    } else {
      return this._reject(event);
    }
  };

  this.Node.prototype._dispatch = function (event) {
    switch (event.type) {
    case 'inlet':   return this.emit(event);
    case 'command': return this._execute(event);
    default: return this;
    }
  };

  this.Node.prototype._require = function (event) {
    var node = this;
    var fqn = event.getFqn();
    return node.create(fqn, fqn, function (err, result) {
      if (err) {
        event.error = err;
        return node._give(event);
      }
      var child = result.leaf;
      for (; child != null; child = child.parent)
        event.history[child.id] = null;
      return node._give(event);
    });
  };

  this.Node.prototype._reject = function (event) {
    if (event.error) {
      return event.reply(event.error);
    } else {
      var target = event.forward.map(function (step) { return step.name; }).join('.');
      return event.reply(Yolo.Util.wrapError('Target: ' + target + ' is not found'));
    }
  };

  this.Node.prototype._execute = function (event) {
    var method = this['__' + event.name];
    if (typeof method == 'function') method.call(this, event);
    return this;
  };

  /**********************/

  this.Node.prototype.__create = function (event) {
    if (this.require instanceof Yolo.Loader) {
      return this.require.require(event.payload.fqn, event.payload.as, function (err, result) {
        if (err) return event.reply(err);
        else return event.reply(null, result);
      });
    } else if (typeof this.require != 'function') {
      return this.require(event.payload, function (err, result) {
        if (err) return event.reply(err);
        else return event.reply(null, result);
      });
    } else {
      return event.reply(Yolo.Util.wrapError('No autoload method'));
    }
  };

  /***********************/

  this.Loader = function (node, invoker, configs) {
    this.node    = node;
    this.invoker = invoker;
    this.configs = configs || {};
  };

  this.Loader.prototype.require = function (from, to, callback) {
    this.inflate([from, to], callback);
  };

  this.Loader.prototype.inflate = function (chain, callback) {
    var trunk = this.node;
    var branch = null;
    var loader = this;
    return (function walker(steps, node) {
      if (node && node.isRouter() || steps.length == 0)
        return callback(null, { trunk: trunk, branch: branch, leaf: node });
      var step = steps.shift();
      var child = trunk.getChild(step.name);
      if (child != null) {
        trunk = child;
        return walker(steps, node);
      }
      var config = new Yolo.Node('$', step.name);
      var elder = config;
      loader.generateData(step.chain, elder.data);
      return (function dripper(chain, elder) {
        var fqn = chain.shift();
        return loader.instanciate(fqn, function (err, layout) {
          if (err && err !== 'NOT_FOUND') return callback(err);
          if (layout == null) layout = elder;
          return (function inheriter(inherits) {
            if (inherits.length > 0) {
              var fqn = inherits.shift();
              return loader.instanciate(fqn, function (err, inherit) {
                if (err) return callback(err);
                loader.generateData([fqn], config.data);
                inherit.setElder(elder);
                elder = inherit;
                Array.prototype.push.apply(inherits, inherit.inherit());
                return inheriter(inherits);
              });
            } else {
              if (layout != elder) layout.setElder(elder);
              if (chain.length > 0) return dripper(chain, layout);
              if (node != null) node.attach(layout, layout.name);
              if (branch == null) branch = layout;
              return walker(steps, layout);
            }
          })(layout != elder ? layout.inherit() : []);
        });
      })(step.chain, elder);
    })(this.generateProcedure(chain), branch);
  };

  this.Loader.prototype.instanciate = function (fqn, callback) {
    var node = new Yolo.Node(fqn, fqn.split('.').pop());
    return this.invoker(fqn, function (err, grower) {
      if (err) return callback(err);
      try { grower(node); }
      catch (e) { return callback(e); }
      if (node.layout == null) node.layout = fqn;
      return callback(null, node);
    });
  };

  this.Loader.prototype.generateData = function (chain, data) {
    if (data == null) data = {};
    var paths = this.generateDataPaths(chain);
    for (var i = 0; i < paths.length; i++) {
      var config = this.configs[paths[i]];
      if (config == null) continue ;
      Yolo.Util.merge(data, config);
    }
    return data;
  };

  this.Loader.prototype.generateDataPaths = function (chain) {
    var paths = [];
    chain.map(function (fqn) {
      fqn = fqn.split('.');
      for (var i = 0; i < fqn.length; i++) {
        var slice = fqn.slice(0, i + 1).join('.');
        if (i + 1 < fqn.length) slice += '.*';
        if (!~paths.indexOf(slice)) paths.push(slice);
      }
    });
    return paths;
  };

  this.Loader.prototype.generateProcedure = function (chain) {
    if (chain.length != 2) throw new Error('Not yet implemented');
    return this.generateSimpleProcedure(chain[0], chain[1]).map(function (step) {
      var chain = [step.from];
      if (step.to != step.from) chain.push(step.to);
      return { name: step.name, chain: chain };
    });
  };

  this.Loader.prototype.generateSimpleProcedure = function (from, to) {
    var from = from.split('.').reverse();
    var to = to != null ? to.split('.').reverse() : from.slice();
    var common = 0;
    var diff = from.length - to.length;
    for (var offset = 0; offset < to.length; offset++)
      if (to[offset] !== from[offset]) break ;
      else common += 1;
    from.reverse();
    to.reverse();
    var rest = [];
    if (common == 0) common += 1;
    var begin = to.slice(0, to.length - common);
    for (var i = 0; i < begin.length; i++) {
      var part = { name: to[i] };
      part.from = begin.slice(0, i + 1).join('.');
      part.to = to.slice(0, i + 1).join('.');
      rest.push(part);
    }
    for (var i = 0; i < common; i++) {
      var j = begin.length + i;
      var part = { name: to[j] };
      part.from = from.slice(0, diff + j + 1).join('.');
      part.to = to.slice(0, j + 1).join('.');
      rest.push(part);
    }
    return rest;
  };

  /***********************/

  Yolo.Util.defer(function () {
    if (this.YoloOnReady == null) return ;
    while (this.YoloOnReady.length > 0) Yolo.Util.defer(this.YoloOnReady.shift());
    this.YoloOnReady == null;
  });

};

