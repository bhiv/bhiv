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

    this.onReady = function (fn) {
      if (this.Yolo != null) return this.Yolo.Util.defer(fn);
      if (typeof this.YoloOnReady == 'undefined') this.YoloOnReady = [fn];
      else this.YoloOnReady.push(fn);
    };

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
        if (holder === alpha) return holder;
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

    this.wrapError = function (e, content) {
      debugger;
      if (!(e instanceof Error)) {
        if (e && typeof e == 'object' && e.error instanceof Error)
          e = e.error;
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
          var err = new Error(/^Error: /.test(e.message) ? e.message.substr(7) : e.message);
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

    this.makeDeprecated = function (fn, l, m) {
      if (l == null) l = 0;
      if (m == null) m = 1;
      return function () {
        console.log('DEPRECATED', new Error().stack.split('\n').slice(2 + l, 2 + m).join('\n'));
        return fn.apply(this, arguments);
      };
    };
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
        cache.queue.shift()(null, data);
    if (date > this._nextTick) return ;
    this.gc();
  };

  this.Cache.prototype.error = function (key, error) {
    var cache = this._map[key];
    if (cache == null) return ;
    cache.expire = 0;
    if (cache.queue)
      while (cache.queue.length > 0)
        cache.queue.shift()(error);
    this.gc();
  };

  this.Cache.prototype.waitFor = function (key, fn) {
    if (this._map[key] == null) this._map[key] = {};
    var cache = this._map[key];
    if ('data' in cache) return fn(null, cache.data), null;
    if (cache.queue == null) cache.queue = [];
    cache.queue.push(fn);
    if (cache.queue.length > 1) return null;
    var self = this;
    return function (err, data) {
      if (err) self.error(key, err);
      else self.set(key, data);
    };
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
    var discard = [];
    for (var key in this._map) {
      var item = this._map[key];
      if (item.expire <= now) {
        discard.push(item);
        continue ;
      } else if (item.expire < nextTick) {
        nextTick = item.expire;
      }
      map[key] = item;
    }
    this._map = map;
    for (var i = 0; i < discard.length; i++)
      while ((discard[i].queue || []).length > 0) {
        var err = new Error('Yolo.Cache: untrottle call garbade collected');
        discard[i].queue.shift()(err);
      }
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

  /** Fqn */

  this.Fqn = new function () {

    this.parse = (function (parser) {
      return function parse(string) {
        return parser.parse(string);
      };
    })(require('./Yolo.Fqn.js'));

    this.stringify = function stringify(fqn, modifier) {
      var result = [];
      var hasModifier = typeof modifier == 'function'
      var hasRoot = false;
      try {
        for (var i = 0; i < fqn.length; i++) {
          var slice = hasModifier ? modifier.call(fqn, fqn[i], i) : fqn[i];
          if (slice == null) continue ;
          switch (slice.type) {
          case 'root':
            hasRoot = true;
            break ;
          case 'child':
            result.push('.', slice.name);
            if (slice.args && slice.args.length > 0) {
              var args = [];
              for (var ii = 0; ii < slice.args.length; ii++)
                args.push(stringify(slice.args[ii]));
              result.push('<', args.join(','), '>');
            }
            break ;
          case 'inlet':
            result.push(':', slice.name);
            break ;
          case 'data':
            result.push('[', slice.path, ']');
            break ;
          case 'field':
            result.push('/', slice.name);
            break ;
          }
        }
      } catch (e) {
        if (e != 'break') throw e;
      }
      var string = result.join('');
      return hasRoot ? string.substr(1) : string;
    };

  };

  /** Event */
  this.Event = function Event(node, fqn, payload) {
    if (arguments.length != 3) throw new Error('All arguments are mandatory');
    if (!(node instanceof Yolo.Node)) throw new Error('Need a node to bring an event');

    this.node    = node;
    this.forward = fqn;
    this.used    = [];
    this.payload = payload != null ? payload : null;
    this.done    = {};
    this.handler = null;
    this.error   = null;
  };

  this.Event._run = function (handler) {
    /* put handler as listener */
    debugger;
  };

  this.Event._typeChildName = function (name) {
    return { type: 'child', name: name };
  };

  this.Event.prototype.run = function (handler) {
    this.run = Yolo.Event._run;
    this.handler = handler || null;
    this.next(); // TODO: defer
    return null; // TODO: return a promise
  };

  this.Event.prototype.did = function (option, value, id) {
    if (id == null) id = this.node.id;
    if (id == '*') {
      for (id in this.done) this.did(option, value, id);
      return this;
    } else {
      if (arguments.length > 1) {
        if (this.done[id] == null) this.done[id] = {};
        this.done[id][option] = value;
        return this;
      } else {
        if (this.done[id] == null) return false;
        return this.done[id][option] || false;
      }
    }
  };

  this.Event.prototype.next = function (slice) {
    if (slice == null) slice = this.forward.shift();
    while (slice != null) {
      var type = '_' + slice.type;
      if (!this.did(slice.type)) {
        this.did(slice.type, true, slice.name || slice.path);
        this.node[type](this, slice);
        slice = this.forward.shift();
      } else {
        debugger;
      }
    }
    return null;
  };

  this.Flux = new function () {

    this.create = function (handler, payload) {
      var flux = function flux(error, success) {
        if (error != null) {
          return flux.emit(flux.has('error') ? 'error' : 'fail', error);
        } else if (arguments.length < 2) {
          return flux.emit(flux.has('done') ? 'done' : 'success', flux.payload);
        } else {
          return flux.emit(flux.has('done') ? 'done' : 'success', success);
        }
      };
      flux.payload = payload;
      flux.emit    = Yolo.Flux._emit;
      flux.has     = Yolo.Flux._has;
      flux.handler = Yolo.Flux._createHandler(handler);
      return flux;
    };

    this.extend = function (callback, object) {
      var handler = new function Handler() {};
      handler.success = function (payload) { return callback(null, payload); };
      handler.fail    = function (payload) { return callback(payload); };
      for (var slot in object) handler[slot] = object[slot];
      return handler;
    };

    this._emit = function (slot, payload) {
      if (!this.has(slot)) return null;
      return this.handler[slot](payload);
    };

    this._has = function (slot) {
      return typeof this.handler[slot] == 'function';
    };

    this._createHandler = function (alpha) {
      if (typeof alpha == 'function') {
        return Yolo.Flux.extend(alpha);
      } else if (Object.prototype.toString.call(alpha) == '[object Object]') {
        return alpha;
      } else if (alpha == null) {
        return {};
      } else {
        debugger;
      }
    };

    this.Handler = function Handler(stage) {
      this.$ = stage;
    };

    this.Handler.prototype.done = function (payload) {
      switch (this.$.track) {
      case 'in': return this.then(payload);
      case 'out': return this.pipe(payload);
      case 'error':
        this.$.flux.payload = payload;
        this.$.turn('out');
        return this.$.next(payload);
      }
    };

    this.Handler.prototype.error = function (payload) {
      this.$.flux.payload = payload;
      this.$.turn('error');
      return this.$.next(payload);
    };

    this.Handler.prototype.then = function (payload) {
      Yolo.Util.merge(this.$.flux.payload, payload);
      return this.$.next(this.$.flux.payload);
    };

    this.Handler.prototype.pipe = function (payload) {
      this.$.flux.payload = payload;
      return this.$.next(payload);
    };

    this.Handler.prototype.back = function (payload) {
      this.$.flux.payload = payload;
      debugger;
    };

    this.Handler.prototype.yield = function (payload) {
      this.$.flux.payload = payload;
      debugger;
    };

    this.Handler.prototype.escape = function (payload) {
      this.$.flux.payload = payload;
      debugger;
    };

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
    this.older    = null;
    this.newer    = null;
    this.children = {};
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
    var older = this;
    var parent = this.parent;
    for (var i = (structure.layouts || []).length - 1; i >= 0; i--)
      older = older.inflate(structure.layouts[i], null, scope);
    var instance = Yolo.Node.create(fqn, scope);
    instance.parent = parent;
    instance.older = older;
    older.parent = instance;
    instance.send(':load', instance);
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
        inferior.older = child;
        inferior = child
        while (inferior.older != null)
          inferior = inferior.older;
      }
    }
    return this;
  };

  this.Node.prototype.hasLayout = function (fqn) {
    if (fqn == null) return false;
    return this.fold(function (node, accu) {
      if (accu) throw 'break';
      return node.layout == fqn;
    }, false);
  };

  /********************************************/

  this.Node.prototype.snapshot = function (scope, isRuntime) {
    if (scope == null) scope = {};
    var snapshot = { id: this.id };
    if (isRuntime && this.layout != null) snapshot.layout = this.layout;
    for (var node = this; node != null; node = node.older) {
      if (node.layout == null) {
        snapshot.data = Yolo.Util.copy(node.data);
        for (var older = node; older; older = node.older) {
          if (older.layout == null) continue ;
          snapshot.layout = older.layout;
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
    var node = this;
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
    if (typeof iterator != 'function') return this.flatten();
    var top = this.self();
    var older = this;
    while (older.older != null) older = older.older;
    while (older != null) {
      iterator(older);
      if (older == top) break ;
      older = older.parent;
    }
  };

  this.Node.prototype.fold = function (iterator, accumulator) {
    try {
      for (var node = this; node != null; node = node.older)
        accumulator = iterator(node, accumulator);
    } finally {
      return accumulator;
    }
  };

  this.Node.prototype.flatten = function (iterator) {
    var flat =
      { id: null, name: null, layouts: [], tags: []
      , data: this.get('.'), inlets: {}, children: {}
      };

    this.inspect(function (older) {

      if (older.id != null) flat.id = older.id;
      if (older.name != null) flat.name = older.name;
      if (older.layout != null) flat.layouts.push(older.layout);

      if (older.tags != null)
        for (var i = 0; i < older.tags.length; i++)
          if (!~flat.tags.indexOf(older.tags[i]))
            flat.tags.push(older.tags[i]);

      for (var name in older.inlets) {
        if (flat.inlets[name] == null) flat.inlets[name] = [];
        flat.inlets[name].push(older.inlets[name]);
      }

      for (var name in older.children) {
        if (flat.children[name] != null) continue ;
        flat.children[name] = older.children[name].flatten(iterator);
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
        return node.self().send(fqn, data, callback);
      });
    };
  };

  /**********************/

  this.Node.prototype.cwd = function (payload) {
    var path = [], self = this.self();
    while (self.parent != null && self.require == null) {
      var value = self.name;
      var hub = Yolo.Util.getIn(payload, self.hub());
      if (hub != null) value += '(' + hub + ')';
      path.unshift(value);
      self = self.parent;
    }
    return path.join('.');
  };

  this.Node.prototype.hub = function (path) {
    if (arguments.length == 0) {
      return this.fold(function (layout, accu) {
        if (accu != null) throw 'break';
        return layout.model.hub;
      }, null);
    }
    this.model.hub = path;
    return this;
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
      older: for (var node = this; node != null; node = node.older) {
        for (var i = 0, l = chain.length, obj = node.data; i < l; ++i) {
          obj = obj[chain[i]];
          if (obj == null) continue older;
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

  this.Node.prototype.inherit = function (fqn) {
    if (arguments.length == 0) {
      if (this.model.kind != null) return [this.model.kind].concat(this.model.inherits || []);
      else return this.model.inherits || [];
    }
    if (this.model.inherits == null) this.model.inherits = [];
    this.model.inherits.push(fqn);
    return this;
  };

  this.Node.prototype.kind = function (kind) {
    if (arguments.length == 0) {
      return this.model.kind || null;
    } else {
      switch (kind) {
      case 'Primitive': break ;
      case 'Record': this.model.fields = {}; break ;
      case 'Collection': break ;
      default: throw new Error('Only "Primitive", "Record", "Collection" is allowed');
      }
    }
    this.model.kind = kind;
    return this;
  };

  this.Node.prototype.field = function (name, type) {
    if (this.kind() != 'Record') throw new Error('This node kind must be a Record');
    if (arguments.length < 1) return Object.keys(this.model.fields);
    if (arguments.length < 2) return this.model.fields[name] || null;
    if (typeof type == 'string') type = { fqn: type, node: null };
    this.model.fields[name] = type;
    return this;
  };

  this.Node.prototype.type = function (type) {
    if (this.kind() != 'Collection') throw new Error('This node kind must be a Collection');
    if (arguments.length == 0) return this.model.type || null;
    if (typeof type == 'string') type = { fqn: type, node: null };
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

  this.Node.prototype.emit = function (inletName, payload, callback) {
    return this.send([{ type: 'inlet', name: inletName }], payload, callback);
  };

  this.Node.prototype.on = function (name, direction, inlet) {
    if (arguments.length == 2) { inlet = direction; direction = 'out' };
    if (this.inlets[name] == null) this.inlets[name] = { _in: null, _out: null, _error: null };
    if (typeof inlet == 'function') inlet = new Yolo.Node.Inlet(inlet);
    else if (!(inlet instanceof Yolo.Node.Inlet)) throw new Error('Need and inlet to bind');
    this.inlets[name]['_' + direction] = inlet;
  };

  this.Node.prototype.spread = function (event, payload, callback) {
    return this.mapreduce(function (node, _, callback) {
      node.emit(event, payload, callback);
    }, null, callback);
  };

  this.Node.prototype.hasInlet = function (name) {
    for (var older = this; older != null; older = older.older) {
      if (!(name in older.inlets)) continue ;
      if (older.inlets[name].length < 1) continue ;
      return true;
    }
    return false;
  };

  this.Node.Inlet = function (fn) {
    this.call = fn;
  };

  this.Node.Stage = function (name, track, node, layout, flux) {
    this.name   = name;
    this.track  = track;
    this.node   = node;
    this.layout = layout;
    this.flux   = flux;
  };

  this.Node.Stage.prototype.run = function () {
    var inlet = this.layout.inlets[this.name];
    var track = '_' + this.track
    var payload = this.flux.payload;
    if (inlet == null || !(inlet[track] instanceof Yolo.Node.Inlet))
      return this.next();
    var ns = Object.create(inlet[track], { node: { value: this.node } });
    var flux = Yolo.Flux.create(this.handler(), payload);
    return inlet[track].call.call(ns, payload, flux);
  };

  this.Node.Stage.prototype.next = function () {
    if (this.track == 'in') {
      if (this.layout.older instanceof Yolo.Node) {
        return this.then(this.layout.older).run();
      } else {
        return this.turn('out').run();
      }
    } else if (this.layout.newer instanceof Yolo.Node) {
      this.then(this.layout.newer).run();
    } else if (this.track == 'out') {
      return this.flux.emit('success', this.flux.payload);
    } else {
      return this.flux.emit('fail', this.flux.payload);
    }
  };

  this.Node.Stage.prototype.turn = function (track) {
    this.track = track;
    return this;
  };

  this.Node.Stage.prototype.then = function (layout) {
    this.layout = layout;
    return this;
  };

  this.Node.Stage.prototype.handler = function () {
    var handler = new Yolo.Flux.Handler(this);
    for (var slot in this.flux.handler)
      if (handler[slot] !== this.flux.handler[slot])
        handler[slot] = this.flux.handler[slot];
    return handler;
  };

  /****************************/

  this.Node.prototype.self = function () {
    var self = this;
    while (self.newer != null)
      self = self.newer;
    return self;
  };

  this.Node.prototype.getLayers = function () {
    var layers = [];
    for (var node = this; node != null; node = node.older)
      layers.push(node);
    return layers;
  };

  this.Node.prototype.setOlder = function (older, atEnd) {
    var node = this;
    if (atEnd === true)
      while (node.older)
        node = node.older;
    node.older = older;
    older.newer = node;
    return this.send([{ type: 'inlet', name: '-set-older' }], older);
  };

  this.Node.prototype.setParent = function (parent) {
    this.parent = parent;
    return this;
  };

  this.Node.prototype.getChild = function (pattern) {
    if (typeof pattern == 'string') {
      pattern = [{ type: 'child', name: pattern }];
    } else if (!(pattern instanceof Array)) {
      pattern = [pattern];
    }
    var slice = pattern.shift();
    return this.fold(function (layout, node) {
      if (node != null) throw 'break';
      if (layout.children[slice.name] == null) return null;
      if (pattern.length > 0) return layout.children[slice.name].getChild(pattern);
      return layout.children[slice.name].self();
    }, null);
  };

  this.Node.prototype.select = function (fqn) {
    var offset = fqn.indexOf('.');
    if (offset > 0) {
      debugger;
      var child = this.children[fqn.substr(0, offset)];
      if (child == null) return null;
      return child.select(fqn.substr(0, offset + 1));
    } else {
      return this.getChild(fqn);
    }
  };

  this.Node.prototype.attach = function (child, name) {
    if (child == null) throw new Error('Missing child node');
    if (child.parent != null && child.parent != this) child.detach();
    if (name == null && child.name != null) name = child.name;
    if (name == null) throw new Error('Missing name');
    var older, offset = name.lastIndexOf('.');
    if (offset > 0) {
      debugger;
      var qn = name.substr(0, offset);
      this.drill(qn).attach(child, name.substr(offset + 1));
    } else {
      var older = this.select(name)
      if (older != null) older.detach();
      child.name = name;
      child.parent = this;
      this.children[name] = child;
    }
    return this;
  };

  this.Node.prototype.detach = function () {
    if (this.parent == null) return this;
    this.parent.detachChild(this.name, this);
    return this;
  };

  this.Node.prototype.detachChild = function (name, reference) {
    for (var node = this; node != null; node = node.older) {
      var child = node.children[name];
      if (child == null) continue ;
      if (reference != null && child != reference) continue ;
      node.children[name] = null;
      child.emit('-detached');
    }
    return this;
  };

  this.Node.prototype.empty = function () {
    var node = this;
    this.getChildren().map(function (child) { node.detach(child.name); });
    return this;
  };

  this.Node.prototype.getChildren = function () {
    var list = [];
    for (var node = this; node != null; node = node.older)
      for (var name in node.children)
        list.unshift(node.children[name]);
    return list;
  };

  this.Node.prototype.getChildrenNames = function () {
    var map = {};
    var names = [];
    for (var node = this; node != null; node = node.older) {
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


  this.Node.prototype.send = function (fqn, payload, callback) {
    if (typeof fqn == 'string') fqn = Yolo.Fqn.parse(fqn);
    return new Yolo.Event(this, fqn, payload).run(callback);
  };

  this.Node.prototype._root = function (event, slice) {
    if (this.parent != null) {
      event.node = this.parent;
      event.forward.unshift(slice);
    } else {
      event.used.push(slice);
    }
  };

  this.Node.prototype._require = function (event, slice) {
    if (this.require == null) return event.forward.unshift(slice);
    event.used.push(slice);
    var flux = Yolo.Flux.create(event.handler, event.payload);
    return this.require.require(event.payload.fqn, event.payload.as, flux);
  };

  this.Node.prototype._child = function (event, slice) {
    if (this.hasChild(slice)) {
      event.node = this.getChild(slice);
      event.used.push(slice);
    } else if (this.parent == null && this.match(slice)) {
      event.used.push(slice);
    } else if (this.require != null && !event.did('require')) {
      event.forward.unshift(slice);
      var forward = event.forward.splice(0, Infinity);
      var fqn = Yolo.Loader.extract(forward).fqn;
      return this.create(fqn, fqn, function (err) {
        event.did('require', true);
        Array.prototype.push.apply(event.forward, forward);
        if (err) event.error = err;
        else event.did('child', false, '*');
        return event.next();
      });
    } else if (this.parent != null) {
      event.node = this.parent;
      event.forward.unshift(slice);
    } else if (event.error) {
      this.send('Log:error', event.error);
    } else {
      debugger ;
    }
  };

  this.Node.prototype._inlet = function (event, slice) {
    var flux = Yolo.Flux.create(event.handler, event.payload);
    return new Yolo.Node.Stage(slice.name, 'in', this, this, flux).run();
  };

  this.Node.prototype._data = function (event, slice) {
    debugger;
  };

  this.Node.prototype._field = function (event, slice) {
    if (this.model.fields == null) return event.forward.splice(0, Infinity);
    if (this.model.fields[slice.name] == null) return event.forward.splice(0, Infinity);
    event.node = this.model.fields[slice.name].node;
  };

  /**************************/

  this.Node.prototype.create = function (fqn, as, callback) {
    if (arguments.length == 2 && typeof as == 'function') {
      callback = as;
      as = null;
    }
    if (typeof callback != 'function') callback = Yolo.noop;
    var payload = { fqn: fqn, as: as };
    var fqn = [{ type: 'root' }, { type: 'require' }];
    return new Yolo.Event(this, fqn, payload).run(function (err, result) {
      if (err) return callback(err);
      else if (typeof as == 'string') {
        result.trunk.attach(result.branch);
        return result.leaf.load(result, callback);
      } else {
        return callback(null, result);
      }
    });
  };

  /***************************/

  this.Node.prototype.match = function (pattern) {
    if (pattern.name != null && pattern.name != this.name) return false;
    if ((pattern.args || []).length > 0) debugger;
    return true;
  };

  this.Node.prototype.hasChild = function (pattern) {
    var children = this.getChildren();
    if (pattern.type != 'child') return false;
    for (var name in children)
      if (children[name].match(pattern))
        return true;
    return false;
  };

  /***********************/

  this.Loader = function (node, invoker, configs) {
    this.node    = node;
    this.invoker = invoker;
    this.configs = configs || {};
  };

  this.Loader.extract = function (fqn) {
    if (typeof fqn == 'string') fqn = Yolo.Fqn.parse(fqn);
    var last = null;
    var base = Yolo.Fqn.stringify(fqn, function (slice, i) {
      switch (slice.type) {
      case 'root': return slice;
      case 'child':
        last = slice;
        return { type: 'child', name: slice.name };
      default: throw 'break';
      }
    });
    var args = (last.args || []).map(function (arg) {
      return Yolo.Fqn.stringify(arg);
    });
    return { fqn: base, args: args };
  };

  this.Loader.chain = function (from, to) {
    var fqn = Yolo.Fqn.parse(to);
    var procedure = [];
    Yolo.Fqn.stringify(fqn, function (slice, i) {
      if (slice.type != 'child') return ;
      var layout = Yolo.Loader.extract(fqn.slice(0, i + 1))
      procedure.push({ name: slice.name, layouts: [layout] });
    });
    var last = procedure[procedure.length - 1];
    var lastLayout = last.layouts[0];
    var layouts = from instanceof Array ? from.slice() : [from];
    layouts = layouts.map(Yolo.Loader.extract);
    last.layouts = layouts;
    for (var i = 0; i < last.layouts.length; i++)
      if (last.layouts[i].fqn == lastLayout.fqn)
        return procedure;
    last.layouts.push(lastLayout);
    return procedure;
  };

  this.Loader.generateDataPaths = function (layout) {
    var paths = [];
    var fqn = layout.fqn.split('.');
    for (var i = 0; i < fqn.length; i++) {
      var slice = fqn.slice(0, i + 1).join('.');
      if (i + 1 < fqn.length) slice += '.*';
      if (!~paths.indexOf(slice)) paths.push(slice);
    }
    return paths;
  };

  this.Loader.prototype.require = function (from, to, callback) {
    var chain = Yolo.Loader.chain(from, to || from);
    return this.inflate(chain, this.node, null, null, callback);
  };

  this.Loader.prototype.inflate = function (chain, trunk, branch, leaf, callback) {
    if (chain.length == 0) {
      if (leaf == null) return callback(null, { trunk: null, branch: null, leaf: trunk });
      else return callback(null, { trunk: trunk, branch: branch, leaf: leaf });
    }
    var step = chain.shift();
    if (branch == null) {
      var child = trunk.getChild(step.name);
      if (child != null) {
        trunk = child;
        return this.inflate(chain, child, branch, leaf, callback);
      }
    }
    var config = new Yolo.Node('$', step.name);
    return this.createSegment(step.layouts, config, config, function (err, node) {
      if (err) return callback.call(this, err);
      if (branch == null) branch = node;
      else leaf.attach(node, node.name);
      return this.inflate(chain, trunk, branch, node, callback);
    });
  };

  this.Loader.prototype.createSegment = function (layouts, config, older, callback) {
    if (layouts.length == 0) return callback.call(this, null, older);
    var layout = layouts.shift();
    Yolo.Util.merge(config.data, this.generateData(layout));
    return this.instanciate(layout, function (err, newer) {
      if (err) return callback.call(this, err);
      if (newer != older) {
        var inherits = newer.inherit().filter(function (fqn) {
          return fqn != layout.fqn;
        }).map(Yolo.Loader.extract);
        if (older != null) {
          for (var i = 0; i < inherits.length; ) {
            if (older.hasLayout(inherits[i].fqn)) inherits.splice(i, 1);
            else i++;
          }
        }
        if (inherits.length > 0) {
          return this.createSegment(inherits, config, older, function (err, older) {
            if (err) return callback(err);
            newer.setOlder(older, true);
            return this.createSegment(layouts, config, newer, callback);
          });
        }
      }
      newer.setOlder(older, true);
      return this.createSegment(layouts, config, newer, callback);
    });
  };

  this.Loader.prototype.generateData = function (layout) {
    var data = {};
    var paths = Yolo.Loader.generateDataPaths(layout);
    for (var i = 0; i < paths.length; i++) {
      var config = this.configs[paths[i]];
      if (config == null) continue ;
      Yolo.Util.merge(data, config);
    }
    return data;
  };

  this.Loader.prototype.instanciate = function (layout, callback) {
    var self = this;
    return this.invoker(layout, function (err, grower) {
      if (err) return callback.call(self, err);
      try { var node = grower(); }
      catch (e) { return callback.call(self, e); }
      return callback.call(self, null, node);
    });
  };

  /***********************/

  Yolo.Util.defer(function () {
    if (this.YoloOnReady == null) return ;
    while (this.YoloOnReady.length > 0) Yolo.Util.defer(this.YoloOnReady.shift());
    this.YoloOnReady == null;
  });

};
