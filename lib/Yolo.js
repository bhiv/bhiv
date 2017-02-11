/**
 * Author: npelletier at wivora dot fr
 *
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
          target = target[chain[0]] = target[chain[0]] ? Yolo.Util.inherit(target[chain[0]]) : {};
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
        if (data._yolo_serialize != null) return data._yolo_serialize;
        else data._yolo_serialize = 'null';
        var result = [];
        for (var i = 0; i < data.length; i++) {
          var value = serialize(data[i], skipempty, iterator);
          if (value == null && skipempty) continue ;
          result.push(value);
        }
        if (result.length < 1 && skipempty) return 'null';
        delete data._yolo_serialize;
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
        if (data._yolo_serialize != null) return data._yolo_serialize;
        if (typeof data.serialize == 'function') {
          return data.serialize(iterator);
        } else {
          data._yolo_serialize = 'Circular()';
          var temp = {};
          var order = [];
          for (var i in data) {
            if (i == '_yolo_serialize') continue ;
            var value = serialize(data[i], skipempty, iterator);
            if (value == null) continue ;
            order.push(i);
            temp[i] = value;
          }
          order.sort();
          var result = [];
          for (var i = 0; i < order.length; i++)
            result.push(serialize(order[i], skipempty, iterator) + ':' + temp[order[i]]);
          delete data._yolo_serialize;
          if (result.length < 1 && skipempty) return 'null';
          return '{' + result.join(',') + '}';
        }
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
      if (holder === alpha) return holder;
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
        } else {
          return Yolo.Util.copy(alpha);
        }
        return holder;
      case '[object Object]':
        if (holder && typeof holder == 'object') {
          for (var i in alpha) {
            if (holder[i] != null && typeof holder[i] == 'object')
              merge(holder[i], alpha[i], replaceArray);
            else
              holder[i] = Yolo.Util.copy(alpha[i]);
          }
          return holder;
        }
        return Yolo.Util.copy(alpha);
      default:
        return Yolo.Util.copy(alpha);
      }
    };

    this.copy = (function () {
      var walk = function walk(key, data, watcher) {
        data = watcher(key, data);
        switch (Object.prototype.toString.call(data)) {
        case '[object Array]': case '[object Arguments]':
          var result = new Array(data.length);
          for (var i = 0; i < data.length; i++) result[i] = walk(i, data[i], watcher);
          return result;
        case '[object Object]':
          if (data.constructor !== Object) return data;
          var result = {};
          for (var i in data) result[i] = walk(i, data[i], watcher);
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
      return function (data, watcher) {
        if (watcher == null) watcher = function (k, v) { return v; };
        return walk('', data, watcher);
      };
    })();

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
      if (e && typeof e == 'object' && e.error instanceof Error) {
        e = e.error;
      } else if (!(e instanceof Error)) {
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

    this.keysOf = (function () {
      if (typeof Object.keys === 'function') return Object.keys;
      return function (obj) {
        var keys = [];
        for (var key in obj)
          if (obj.hasOwnProperty(key))
            keys.push(key);
        return keys;
      };
    })();

    this.inherit = (function () {
      if (typeof Object.create === 'function') return Object.create;
      return function (obj) {
        var Skeleton = function () {};
        Skeleton.prototype = obj;
        return new Skeleton();
      };
    })();
  };

  /** Async */

  this.Async = new function () {

    this.each = function (collection, iterator, callback) {
      var count = collection.length;
      if (count == 0) return callback();
      var hasFailed = false;
      for (var i = 0; i < count; i++) {
        Yolo.Util.defer(iterator, collection[i], function (err, value) {
          count -= 1;
          if (err) {
            if (hasFailed) return ;
            hasFailed = true;
            return callback(err);
          } else {
            if (count > 0 || hasFailed) return ;
            return callback();
          }
        });
      }
    };

    this.map = function (collection, iterator, callback) {
      if (!(collection instanceof Array))
        return callback(new Error('collection must be an Array'));
      var count = collection.length;
      var result = new Array(count);
      if (count == 0) return callback(null, result);
      var hasFailed = false;
      for (var i = 0; i < count; i++) (function (item, i) {
        return Yolo.Util.defer(iterator, item, function (err, value) {
          count -= 1;
          if (err) {
            if (hasFailed) return ;
            hasFailed = true;
            return callback(err);
          } else {
            result[i] = value;
            if (count > 0 || hasFailed) return ;
            return callback(null, result);
          }
        });
      })(collection[i], i);
    };

    this.fold = function fold(source, accumulator, iterator, callback) {
      if (source.length < 1) return callback(null, accumulator);
      var actions = source.slice();
      return iterator(actions.shift(), accumulator, function (err, accumulator) {
        if (err) return callback(err, accumulator);
        return fold(actions, accumulator, iterator, callback);
      });
    };

    this.walk = function (data, watcher, callback) {
      return watcher(data, function (err, data) {
        if (err) return callback(err);
        switch (Object.prototype.toString.call(data)) {
        case '[object Array]': case '[object Arguments]':
          return Yolo.Async.map(data, function (value, callback) {
            return Yolo.Async.walk(value, watcher, callback);
          }, callback);
        case '[object Object]':
          var result = {};
          return Yolo.Async.each(Yolo.Util.keysOf(data), function (key, callback) {
            return Yolo.Async.walk(data[key], watcher, function (err, value) {
              if (err) return callback(err);
              result[key] = value;
              return callback();
            });
          }, function (err) {
            if (err) return callback(err);
            return callback(null, result);
          });
        case '[object Undefined]':
          return callback(null, null);
        default:
          return callback(null, data);
        }
      });
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
    this.setDefaultExpire(expire);
  };

  this.Cache.prototype.setDefaultExpire = function (expire) {
    this._expire = expire >= 0 ? (expire * 1000) : Infinity;
    return this;
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

  this.Cache.prototype.pick = function (key) {
    var value = this.get(key);
    this.remove(key);
    return value;
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

  /** Yolo Virtual Machine */

  this.VM = new function () {

    /** AST */

    this.AST = new function () {

      /* Block */
      this._Block = function () {};

      this._Block.prototype._push = function (ast) {
      
        return this;
      };

      this._Block.prototype.end = function () {
        return this._parent._push(this._ast);
      };

      /* Waterfall */
      this._Waterfall = function (parent, end) {
        this._ast    = null;
        this._parent = parent;
        if (end) this.end = end;
      };

      this._Waterfall.prototype = new this._Block();

      this._Waterfall.prototype.goto = function (path, closures) {
        return this._push({ type: 'goto', path: path, closures: closures });
      };

      this._Waterfall.prototype.format = function (glue) {
        return this._push(glue);
      };

      this._Waterfall.prototype.then = function (fqn, glue, options) {
        var action = { $: fqn };
        if (arguments.length > 1) action._ = glue;
        if (arguments.lnegth > 2) action.$$ = options;
        return this._push(action);
      };

      this._Waterfall.prototype.shunt = function (predicate, glue) {
        
      };

      this._Waterfall.prototype.unless = function () {
        
      };

      this._Waterfall.prototype.filter = function (source, iterator, glue) {
        return this.Filter(source, glue).then(iterator).end();
      };

      this._Waterfall.prototype.Memoize = function (duration, glue) {
        return new this.Waterfall(this, function () {
          var ast = { type: 'memoize', key: glue, expire: duration, then: this._ast };
          return this._parent._push(ast);
        });
      };

      this._Waterfall.prototype.Fold = function (source, iterator, glue) {
        
      };

      this._Waterfall.prototype.Filter = function (source, glue) {
        return new this._Waterfall(this, function () {
          this._parent._push({ type: 'filter', source: source, glue: glue, iterator: this._ast });
        });
      };

      this._Waterfall.prototype.Detect = function (source, iterator, glue) {
        
      };

      this._Waterfall.prototype.Trap = function () {
        return new this.Waterfall(this, function () {
          
        });
      };

      this._Waterfall.prototype.Until = function () {
        return new this.Waterfall(this, function () {
          
        });
      };

      this._Waterfall.prototype.Retry = function () {
        return new this.Waterfall(this, function () {
          
        });
      };

      this._Waterfall.prototype.Race = function () {
        return new this._Race(this, function () {
          
        });
      };

      this._Waterfall.prototype.map = function () {
        return new this._Waterfall(this, function () {
          
        });
      };

      this._Waterfall.prototype.Match = function () {
        return new this._Match(this);
      };

      /* Match */
      this._Match = function (end) {
        this._ast    = null;
        this._parent = parent;
        if (end) this.end = end;
      };

      this._Match.prototype = new this._Block();

      this._Match.prototype.when = function () {
        return new this._Waterfall(this);
      };

      this._Match.prototype.otherwise = function () {
        
      };

      /* Race */
      this._Race = function (parent, end) {
        this._ast    = null;
        this._parent = parent;
        if (end) this.end = end;
      };

      this._Race.prototype = new this._Block();

      this._Race.prototype.at = function () {
        
      };

    };

    /* Runtime */
    this.Runtime = function (node) {
      this.node = node.newest();
    };

    this.Runtime.prototype.run = function (ast, payload, callback) {
      switch (Object.prototype.toString.call(ast)) {
      case '[object Object]':
        if ('$_' in ast) this.interrupt(ast.$_, payload);
        if ('$$' in ast) callback = this.wrapCallback(ast.$$, payload, callback);
        if ('$'  in ast) return this.execute(ast, payload, callback);
        if ('_'  in ast) return this.translate(ast._, payload, callback);
        if ('__' in ast) return callback(null, ast.__);
        return this.mapObject(ast, payload, callback);
      case '[object Function]':
        return this.call(ast, payload, callback);
      case '[object Array]':
        return this.map(ast, payload, callback);
      case '[object String]':
        return this.resolve(ast, payload, callback);
      default :
        return callback(null, ast);
      }
    };

    this.Runtime.prototype.copy = function (ast, payload, callback) {
      return callback(null, Yolo.Util.copy(payload));
    };

    this.Runtime.prototype.log = function (criticity, message) {
      this.node.send('Log:' + criticity, [this.node.fqn, message]);
    };

    this.Runtime.prototype.execute = function (ast, data, callback) {
      var runtime = this;
      if ('_' in ast)
        return this.translate(ast._, data, function (err, data) {
          if (err) return callback(err);
          return runtime.execute({ $: ast.$ }, data, callback);
        });
      if (typeof ast.$ == 'string') return this.send(ast.$, data, callback);
      if (ast.$ instanceof Array) return this.waterfall(ast.$, data, callback);
      if (ast.$ && typeof ast.$ == 'object') {
        if (ast.$.type != null && ast.$.type in this)
          return this[ast.$.type](ast.$, data, callback);
        else
          return callback(new Error('Runtime: Try to execute a unknown pattern'));
      } else {
        return this.mapObject(ast, data, callback);
      }
    };

    this.Runtime.prototype.send = function (fqn, payload, callback) {
      return this.node.send(fqn, payload, callback)
    };

    this.Runtime.prototype.call = function (func, payload, callback) {
      switch (func.length) {
      case 0: case 1:
        try { var result = func.call(this, payload); }
        catch (error) { return callback(error); }
        return callback(null, result);
      case 2:
        return func.call(this, payload, callback);
      default:
        return callback(new Error('Runtime: Unknown how to handle this kind of function'));
      }
    };

    this.Runtime.prototype.translate = function (ast, data, callback) {
      return this.run(ast, data, callback);
    };

    this.Runtime.prototype.map = function (list, data, callback) {
      var runtime = this;
      return Yolo.Async.map(list, function (schema, callback) {
        return runtime.run(schema, data, function (err, value) {
          if (err) {
            err = Yolo.Util.wrapError(err, schema);
            runtime.log('error', err);
            return callback(null, err);
          } else {
            return callback(null, value);
          }
        });
      }, callback);
    };

    this.Runtime.prototype.mapObject = function (object, data, callback) {
      var result = {};
      var runtime = this;
      return Yolo.Async.each(Yolo.Util.keysOf(object), function (key, callback) {
        var work = object[key];
        return runtime.run(work, data, function (err, value) {
          if (err) {
            err = Yolo.Util.wrapError(err, work);
            runtime.log('error', err);
            result[key] = err;
          }
          else result[key] = value;
          return callback();
        });
      }, function (err) {
        return callback(err, result);
      });
    };

    this.Runtime.prototype.filter = function (ast, data, callback) {
      var runtime = this;
      return this[ast.source ? 'run' : 'identity'](ast.source, data, function (err, source) {
        if (err) return callback(err);
        var result = [];
        return Yolo.Async.each(source, function (item, callback) {
          return runtime.run(ast.iterator, item, function (err, keep) {
            if (err) return callback(err);
            if (keep) result.push(item);
            return callback();
          });
        }, function (err) {
          return callback(err, result);
        });
      });
    };

    this.Runtime.prototype.fold = function (ast, data, callback) {
      
    };

    this.Runtime.prototype.detect = function (ast, data, callback) {
      
    };

    this.Runtime.prototype.waterfall = function (workflow, data, callback) {
      var runtime = this;
      return Yolo.Async.fold(workflow, data, function (ast, accumulator, callback) {
        return runtime.run(ast, accumulator, callback);
      }, callback);
    };

    this.Runtime.prototype.resolve = function (str, data, callback) {
      if (str.substr(0, 2) == '${' && str.substr(-1) == '}') {
        var path = query.substr(2, str.length - 3);
        return callback(null, Yolo.Util.getIn(data, path));
      } else {
        return callback(null, str);
      }
    };

    this.Runtime.prototype.interrupt = function (options, data) {
      if (options.debug) debugger;
    };

    this.Runtime.prototype.match = function (ast, data, callback) {
      var runtime = this;
      return this.run(ast.match, data, function (err, result) {
        if (err) return callback(err);
        var patterns = Yolo.Util.keysOf(ast.cases || {});
        return Yolo.Async.fold(patterns, null, function (pattern, success, callback) {
          if (success) return callback(null, success);
          return runtime.resolve(pattern, result, function (err, result) {
            if (err) return callback(err);
            return callback(null, result ? pattern : null);
          });
        }, function (err, pattern) {
          if (err) return callback(err);
          if (pattern == null) return runtime.run(ast.otherwise, data, callback);
          return runtime.run(ast.cases[pattern], data, callback);
        });
      });
    };

    this.Runtime.prototype.unless = function (prefetch, data, callback) {
      var runtime = this;
      return this.run(prefetch.unless, data, function (err, result) {
        if (err) return callback(err);
        if (result) return callback(null, data);
        return runtime.run(prefetch.proceed, data, callback);
      });
    };

    this.Runtime.prototype.identity = function (ast, data, callback) {
      return callback(null, data);
    };

    this.Runtime.prototype.assert = function (ast, data, callback) {
      return this.run(ast, data, function (err, payload) {
        if (err) return callback(err);
        if (payload.match) return callback(null, data);
        return callback(new Error(payload.message));
      });
    };

    this.Runtime.prototype.memoize = function (rule, data, callback) {
      var runtime = this;
      var key = 'key' in rule ? rule.key : { __: data };
      var memo = this.node.get('__memoize');
      if (memo == null) this.node.set('__memoize', memo = new Yolo.Cache());
      return this.run({ key: key, expire: rule.expire }, data, function (err, info) {
        if (err) return callback(err);
        if (!(info.expire > 0)) info.expire = 0.01; // 10 ms
        else info.expire /= 1000;
        var digest = Yolo.Digest(info.key);
        var work = memo.get(digest);
        if (work != null) {
          switch (work.type) {
          case 'pending': work.waiters.push(callback); break ;
          case 'result': return callback(null, work.value);
          default: return callback(new Error('Memoization in unknown state'));
          }
        } else {
          memo.set(digest, { type: 'pending', waiters: [callback] });
          return runtime.run(rule.then, data, function (err, value) {
            var work = memo.pick(digest);
            if (err == null) memo.set(digest, { type: 'result', value: value }, info.expire);
            if (work == null) return callback(err, value);
            while (work.waiters.length > 0) work.waiters.shift()(err, value);
          });
        }
      });
    };

    this.Runtime.prototype.wrapCallback = function (ast, payload, callback) {
      if (!(ast instanceof Array)) ast = [ast];
      for (var i = 0; i < ast.length; i++)
        callback = (function (runtime, method, payload, callback) {
          return function (error, result) {
            var data = { error: error, payload: payload, result: result };
            return runtime[method.type](method, data, callback);
          };
        })(this, ast[i], payload, callback);
      return callback;
    };

    this.Runtime.prototype.merge = function (ast, data, callback) {
      if (data.error) return callback(data.error);
      switch (ast.mode) {
      case 'wrap':
        return this.run(ast.glue, data, callback);
      case 'root':
        var result = Yolo.Util.merge(data.payload, data.result);
        return callback(null, result);
      case 'into':
        var result = Yolo.Util.merge(Yolo.Util.getIn(data.payload, ast.to), data.result);
        Yolo.Util.setIn(data.payload, ast.to, result);
        return callback(null, data.payload);
      case 'set':
        Yolo.Util.setIn(data.payload, ast.to, data.result);
        return callback(null, data.payload);
      default:
        return callback(null, data.result);
      }
    };

    this.Runtime.prototype.void = function (ast, data, callback) {
      if (data.error != null) return callback(data.error);
      return callback(null, data.payload);
    };

    this.Runtime.prototype.trap = function (ast, data, callback) {
      if (data.error == null) return callback(data.error, data.result);
      if (data.error instanceof Error) data.message = data.error.message;
      if (ast.when == null) return this.run(ast.then, data, callback);
      var runtime = this;
      return this.run(ast.when, data, function (err, result) {
        if (err) return callback(err);
        if (ast.match instanceof RegExp) {
          if (ast.match.test(result))
            return runtime.run(ast.then, data, callback);
        } else {
          debugger;
          return callback(new Error('Not yet implemented'));
        }
        return callback(data.error);
      });
    };

    /* Flux */
    this.Flux = new function () {

      this.create = function (handler) {
        var flux = function flux(error, success) {
          if (error != null) return flux.emit('fail', error);
          if (arguments.length < 2) { debugger; throw new Error('should not responde without args'); }
          return flux.emit('success', success);
        };
        flux.emit    = _emit;
        flux.has     = _has;
        flux.handler = new Yolo.VM.Handler(handler);
        return flux;
      };

      var _emit = function (slot, payload) {
        if (!this.has(slot)) return /* events are dropped here ! */;
        return this.handler[slot](payload);
      };

      var _has = function (slot) {
        return this.handler[slot] != null;
      };

    };

    /* Handler */
    this.Handler = function Handler(alpha) {
      if (typeof alpha == 'function') {
        this.success = function (payload) { return alpha(null, payload); };
        this.fail = function (payload) { return alpha(payload); };
        return this;
      } else if (alpha instanceof Handler) {
        return alpha;
      } else if (Object.prototype.toString.call(alpha) == '[object Object]') {
        for (var slot in alpha)
          if (typeof alpha[slot] == 'function')
            this[slot] = alpha[slot];
        if (alpha.callback)
          (function (callback) {
            this.success = function (payload) { return callback(null, payload); };
            this.fail = function (payload) { return callback(payload); };
          }).call(this, alpha.callback);
        return this;
      } else {
        return this;
      }
    };

  };

  /** Fqn */

  this.Fqn = new function () {

    this.parse = (function (parser) {
      return function parse(string) {
        return parser.parse(string);
      };
    })(require('./Yolo.Fqn.pegjs'));

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

  this.Node.prototype.toString = function () {
    return '[object YoloNode]';
  };

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
      this.data = Yolo.Util.merge(this.data, structure.data);
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
    if (snapshot.data != null) this.data = Yolo.Util.merge(this.data, snapshot.data);
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
    var top = this.newest();
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
    } catch (e) {
      if (e != 'break') throw e;
    }
    return accumulator;
  };

  this.Node.prototype.foldr = function (iterator, accumulator) {
    try {
      for (var node = this.oldest(); node != null; node = node.newer)
        accumulator = iterator(node, accumulator);
    } catch (e) {
      if (e != 'break') throw e;
    }
    return accumulator;
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
        if (typeof fqn != 'string') throw new Error('Only string allowed');
        return node.newest().send(fqn, data, callback);
      });
    };
  };

  /**********************/

  this.Node.prototype.cwd = function (payload) {
    var path = [], self = this.newest();
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
      case 'Primitive':
        break ;
      case 'Record':
        this.model.identities = {};
        this.model.fields = {};
        break ;
      case 'Collection':
        this.model.type = null;
        break ;
      default:
        throw new Error('Only "Primitive", "Record", "Collection" is allowed');
      }
    }
    this.model.kind = kind;
    return this;
  };

  this.Node.prototype.identity = function (name, fields, constraints) {
    if (this.kind() != 'Record') throw new Error(this.cwd() + ': This node kind must be a Record');
    if (arguments.length < 1) return this.fold(function (layout, identities) {
      if (layout.model.identities == null) return identities;
      for (var identity in layout.model.identities)
        if (!~identities.indexOf(identity))
          identities.push(identity);
      return identities;
    }, []);
    if (arguments.length < 2) return this.fold(function (layout, identity) {
      if (identity != null) throw 'break';
      if (layout.model.identities == null) return null;
      return layout.model.identities[name] || null;
    }, null);
    if (!(fields instanceof Array)) throw new Error('Bad argument');
    this.model.identities[name] = { fields: fields, constraints: constraints || {} };
    return this;
  };

  this.Node.prototype.field = function (name, fqn, options) {
    if (this.kind() != 'Record') throw new Error(this.cwd() + ': This node kind must be a Record');
    if (options == null) options = {};
    else if (options === true) options = { required: true };
    if (arguments.length < 1) return this.fold(function (layout, fields) {
      if (layout.model.fields == null) return fields;
      var set = [];
      for (var field in layout.model.fields)
        if (!~fields.indexOf(field))
          set.push(field);
      return set.concat(fields);
    }, []);
    if (arguments.length < 2) return this.fold(function (layout, field) {
      if (field != null) throw 'break';
      if (layout.model.fields == null) return null;
      return layout.model.fields[name] || null;
    }, null);
    if (options == null) options = {};
    this.model.fields[name] = { fqn: fqn, options: options, node: null };
    if (options.unique && this.model.identities[name] == null)
      this.model.identities[name] = { fields: [name] };
    return this;
  };

  this.Node.prototype.type = function (type) {
    if (this.kind() != 'Collection') throw new Error('This node kind must be a Collection');
    if (arguments.length == 0) return this.fold(function (layout, type) {
      if (type != null) throw 'break';
      return layout.model.type || null;
    }, null);
    if (typeof type == 'string') type = { fqn: type, node: null };
    this.model.type = type;
    return this;
  };

  this.Node.prototype.check = function (name, check) {
    if (this.model.checks == null) this.model.checks = {};
    if (arguments.length < 1) return this.fold(function (layout, checks) {
      if (layout.model.checks == null) return checks;
      for (var check in layout.model.checks)
        if (!~checks.indexOf(check))
          checks.push(check);
      return checks;
    }, []);
    if (arguments.length < 2) return this.fold(function (layout, check) {
      if (check != null) throw 'break';
      if (layout.model.checks == null) return null;
      return layout.model.checks[name] || null;
    }, null);
    if (typeof check != 'function')
      throw new Error('Need a function to check');
    if (this.model.checks[name] != null)
      throw new Error('Check with name: ' + name + 'already defined');
    this.model.checks[name] = check;
    return this;
  };

  this.Node.prototype.patch = function (name, patch) {
    if (this.model.patches == null) this.model.patches = {};
    if (arguments.length < 1) return this.fold(function (layout, patches) {
      if (layout.model.patches == null) return patches;
      var set = [];
      for (var patch in layout.model.patches)
        if (!~patches.indexOf(patch))
          set.push(patch);
      return set.concat(patches);
    }, []);
    if (arguments.length < 2) return this.fold(function (layout, patch) {
      if (patch != null) throw 'break';
      if (layout.model.patches == null) return null;
      return layout.model.patches[name] || null;
    }, null);
    if (typeof patch != 'function')
      throw new Error('Need a function to patch');
    if (this.model.patches[name] != null)
      throw new Error('Patch with name: ' + name + 'already defined');
    this.model.patches[name] = patch;
    return this;
  };

  /*********************/

  this.Node.prototype.emit = function (inletName, payload, callback) {
    return this.send([{ type: 'inlet', name: inletName }], payload, callback);
  };

  this.Node.prototype.on = function (name, ast) {
    if (this.inlets[name] != null) throw new Error('Method: ' + name + ' already bound');
    switch (arguments.length) {
    case 1:
      var node = this;
      var error = new Error('Procedure not ended');
      Yolo.Util.defer(function () { if (error) node.send('Log:error', error); });
      return new Yolo.VM.AST._Waterfall(null, function () {
        error = null;
        node.inlets[name] = this._ast;
        return node;
      });
    case 2:
      this.inlets[name] = ast;
      return this;
    default:
      throw new Error('Unknown how to handle ' + arguments.length + ' arguments');
    }
  };

  this.Node.prototype.spread = function (event, payload, callback) {
    return this.mapreduce(function (node, _, callback) {
      node.emit(event, payload, callback);
    }, null, callback);
  };

  /****************************/

  this.Node.prototype.newest = function () {
    var layout = this;
    while (layout.newer != null)
      layout = layout.newer;
    return layout;
  };

  this.Node.prototype.oldest = function () {
    var layout = this;
    while (layout.older != null)
      layout = layout.older;
    return layout;
  };

  this.Node.prototype.getLayers = function () {
    var layers = [];
    for (var node = this; node != null; node = node.older)
      layers.push(node);
    return layers;
  };

  this.Node.prototype.setOlder = function (older, atEnd) {
    if (!(older instanceof Yolo.Node)) throw new Error('Bad node type');
    var node = this;
    if (atEnd === true)
      while (node.older != null)
        node = node.older;
    node.older = older;
    older.newer = node;
    return this.emit('-set-older', older);
  };

  this.Node.prototype.setParent = function (parent) {
    if (!(parent instanceof Yolo.Node)) throw new Error('Bad node type');
    this.parent = parent;
    return this.emit('-set-parent', parent);
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
      return layout.children[slice.name].newest();
    }, null);
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

  this.Node.prototype.attach = function (child, name) {
    if (child == null) throw new Error('Missing child node');
    if (child.parent != null && child.parent != this) child.detach();
    if (name == null && child.name != null) name = child.name;
    if (name == null) throw new Error('Missing name');
    var older = this.getChild(name);
    if (older != null) {
      if (older === child) return this;
      else throw new Error('Child with the same name ' + name + ' already attached');
    }
    child.name = name;
    child.parent = this;
    this.children[name] = child;
    child.emit('-attached', this);
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

  this.Node.prototype.eat = function (ast, payload, callback) {
    return new Yolo.VM.Runtime(this).run(ast, payload, callback);
  };

  this.Node.prototype._root = function (event, slice) {
    if (this.parent != null) {
      event.node = this.parent;
      event.forward.unshift(slice);
    } else {
      event.used.push(slice);
    }
  };

  this.Node.prototype._require = (function () {
    var from = function from(node, fqn) {
      if (fqn == null) return null;
      if (node.parent != null) return fqn;
      if (fqn instanceof Array) return fqn.map(function (fqn) { return from(node, fqn); });
      return fqn.charAt(0) == '.' ? fqn.substr(1) : fqn;
    };
    return function (event, slice) {
      if (this.require == null) return event.forward.unshift(slice);
      event.used.push(slice);
      var as = from(this, event.payload.as);
      var fqn = from(this, as || event.payload.fqn);
      var pending = this.require.pending;
      if (pending[fqn] == null) pending[fqn] = [];
      pending[fqn].push(event.handler);
      if (pending[fqn].length > 1) return /* response would arrive on time */;
      var reply = function (err, result) {
        while (pending[fqn].length > 0)
          pending[fqn].shift()(err, result);
        delete pending[fqn];
      };
      return this.require.require(from(this, event.payload.fqn), as, function (err, result) {
        if (err) return reply(err);
        if (typeof as == 'string') {
          result.trunk.attach(result.branch);
          return result.leaf.emit('-load', result, reply);
        }
        return reply(null, result);
      });
    };
  })();

  this.Node.prototype._create = function (event, slice) {
    event.forward.unshift(slice);
    var forward = event.forward.splice(0, Infinity);
    var fqn = Yolo.Loader.extract(forward).fqn;
    if (fqn.charAt(0) == '.') fqn = this.cwd() + fqn;
    return this.create(fqn, fqn, function (err, node) {
      event.did('require', true);
      Array.prototype.push.apply(event.forward, forward);
      if (err) event.error = err;
      else event.did('child', false, '*');
      return event.next();
    });
  };

  this.Node.prototype._child = function (event, slice) {
    var child = this.getChild(slice);
    var last = event.used[event.used.length - 1] || null;
    if (child != null) {
      event.node = child;
      event.used.push(slice);
    } else if (this.parent == null && this.match(slice)) {
      event.used.push(slice);
    } else if (this.require != null && !event.did('require')) {
      this._create(event, slice);
    } else if (this.parent != null) {
      if (last != null && last.type == 'child') {
        this._create(event, slice);
      } else {
        event.node = this.parent;
        event.forward.unshift(slice);
      }
    }
    if (event.error) this.send('Log:error', event.error);
  };

  this.Node.prototype._inlet = function (event, slice) {
    var runtime = new Yolo.Node.InletRuntime(this, slice.name);
    var flux  = Yolo.VM.Flux.create(event.handler);
    return runtime.super(event.payload, flux);
  };

  this.Node.InletRuntime = function (node, name) {
    Yolo.VM.Runtime.call(this, node);
    this.__next = node;
    this.__name = name;
  };

  this.Node.InletRuntime.prototype = Yolo.Util.inherit(Yolo.VM.Runtime.prototype);

  this.Node.InletRuntime.prototype.super = function (payload, callback) {
    while (this.__next != null) {
      var has = this.__name in this.__next.inlets;
      var ast = this.__next.inlets[this.__name];
      this.__next = this.__next.older;
      if (!has) continue ;
      return this.run(ast, payload, callback);
    }
    return callback(null, payload);
  };

  this.Node.InletRuntime.prototype.next = function (callback) {
    var self = this;
    return function (err, result) {
      if (err) return callback(err);
      return self.super(result, callback);
    };
  };

  this.Node.prototype._data = (function () {
    var produce = function produce(tree, payload) {
      var path = [];
      for (var i = 0; i < tree.length; i++) {
        switch (tree[i].type) {
        case 'literal':
          path.push(tree[i].value);
          break ;
        case 'dynamic':
          var subpath = produce(tree[i].path, payload).join('.');
          var subvalue = Yolo.Util.getIn(payload, subpath);
          path.push(subvalue);
          break ;
        }
      }
      return path;
    };
    return function (event, slice) {
      var path = produce(slice.path, event.payload);
      var value = this.get(path.join('.'));
      if (event.forward.length > 0) return ;
      return event.handler(null, value);
    };
  })();

  this.Node.prototype._field = function (event, slice) {
    switch (this.kind()) {
    case 'Collection':
      var type = this.type();
      if (type == null) {
        event.node.send('Log:error', event.node.cwd() + ': Collection has no type specified');
        return event.forward.splice(0, Infinity);
      }
      event.node = type.node;
      if (slice.name == '@') return ;
      else return type.node._field(event, slice);
    case 'Record':
      var field = this.field(slice.name);
      if (field == null) {
        event.node.send('Log:error', event.node.cwd() + ': has no field named "' + slice.name + '"');
        return event.forward.splice(0, Infinity);
      }
      event.node = field.node;
      return ;
    case 'Primitive':
      event.node.send('Log:error', event.node.cwd() + ': Primitive has no field');
      return event.forward.splice(0, Infinity);
    }
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
    return new Yolo.Event(this, fqn, payload).run(callback);
  };

  /***************************/

  this.Node.prototype.match = function (pattern) {
    if (pattern.name != null && pattern.name != this.name) return false;
    return true;
  };

  this.Node.prototype.hasChild = function (pattern) {
    var children = this.getChildren();
    if (pattern.type != 'child') return false;
    for (var name in children)
      if (children[name] != null && children[name].match(pattern))
        return true;
    return false;
  };

  /** Structure */

  this.Structure = function Structure() {};

  /**********************/

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

  this.Event._typeChildName = function (name) {
    return { type: 'child', name: name };
  };

  this.Event.prototype.toString = function () {
    return '[object YoloEvent]';
  };

  this.Event.prototype.run = function (handler) {
    this.run = null; // can not run twice
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
      if (value != null) {
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
      }
    }
    return null;
  };

  /**********************************/

  this.Loader = function (node, invoker, configs) {
    this.node    = node;
    this.invoker = invoker;
    this.configs = configs || {};
    this.pending = {};
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
    if (to == null) to = from;
    var chain = Yolo.Loader.chain(from, to);
    return this.inflate(chain, this.node, null, null, callback);
  };

  this.Loader.prototype.inflate = function (chain, trunk, branch, leaf, callback) {
    if (chain.length == 0) {
      var result = leaf == null ? { trunk: null, branch: null, leaf: trunk }
                                : { trunk: trunk, branch: branch, leaf: leaf };
      return result.leaf.emit('-init', result, callback);
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
    config.data = Yolo.Util.merge(config.data, this.generateData(layout));
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
      data = Yolo.Util.merge(data, config);
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
