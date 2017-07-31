/**!
 * Author: npelletier at wivora dot fr
 * Magic: UroxGvT3uDMQCT1va20i43ZZSxo
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
      var chars = '8LXql5kseOmIUroxGvT3uDMQCT1va20i43ZZSxoYFNEdPgw7zWhpnBA9yKbfJRjH6Vct';
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
      if (Yolo.Util.isObject(source)) {
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
        } else if (target.hasOwnProperty(chain[0]) && Yolo.Util.isObject(target[chain[0]])) {
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
        if (data.constructor && data.constructor !== Object && data.constructor.toString)
          return data.toString();
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

    this.walk = function walk(data, iterator, path) {
      if (path == null) path = [];
      iterator(path, data);
      switch (Object.prototype.toString.call(data)) {
      case '[object Object]':
        if (data.constructor !== Object) return ;
        var done = {};
        for (var key in data) {
          done[key] = true;
          walk(data[key], iterator, path.concat(key));
        }
        break ;
      case '[object Array]':
        for (var i = 0, l = data.length; i < l; i++)
          walk(data[i], iterator, path.concat(i));
      default:
        return ;
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

    this.kind = function (alpha) {
      var name = Object.prototype.toString.call(alpha);
      return name.substring(8, name.length - 1);
    };

    this.isObject = function (alpha) {
      if (alpha instanceof Object) return true;
      if (Yolo.Util.kind(alpha) == 'Object') return true;
      return false;
    };

    // Use to create Node Name syntax form unsanitized string
    this.name = function (name) {
      return (name + '').split(/\./g).map(function (part) {
        return part.split(/[^a-z0-9]+/gi).map(function (part) {
          return part.substr(0, 1).toUpperCase() + part.substr(1);
        }).join('');
      }).join('.');
    };

    // Use to create method name syntax form unsanitized string
    this.method = function (method) {
      return (method + '').split(/-/g).map(function (part) {
        return part.split(/[^a-z0-9]+/gi).map(function (part) {
          return part.toLowerCase();
        }).join('');
      }).join('-');
    };

    this.compare = (function () {
      var order = [ 'Undefined', 'Null', 'Boolean', 'Number', 'Date', 'String'
                  , 'Function', 'Arguments', 'Array', 'Object'
                  ];
      return function (left, right) {
        try {
          Yolo.Util.walk2(left, right, function (path, left, right) {
            if (left == right) return ;
            var lType = Yolo.Util.kind(left);
            var rType = Yolo.Util.kind(right);
            if (lType != rType) throw order.indexOf(lType) > order.indexOf(rType) ? 1 : -1;
            switch (lType) {
            case 'Object': return ;
            case 'Array': case 'Arguments':
              if (left.length == right.length) return ;
              else throw left.length > right.length ? 1 : -1;
            case 'Number': if (isNaN(left) && isNaN(right)) return ;
            case 'Function': if (!(left > right) && !(right > left)) return ;
            default: throw left > right ? 1 : -1;
            }
          });
          return 0;
        } catch (e) {
          return e;
        }
      };
    })();

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
        if (e == null) e = new Error();
        if (/error/i.test(e.constructor.name)) {
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

    this.default = function (holder, defaults) {
      for (var key in defaults)
        if (holder[key] == null)
          holder[key] = defaults[key];
      return holder;
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

    this.inArray = (function () {
      if (typeof Array.prototype.indexOf === 'function')
        return function (array, value) { return !!~array.indexOf(value); };
      else
        return function (array, value) {
          for (var i = 0; i < array.length; i++)
            if (array[i] === value)
              return true;
          return false;
        };
    })();

  };

  /** Async */

  this.Async = new function () {

    this.each = function (collection, iterator, callback) {
      if (collection == null) return callback();
      if (!(collection instanceof Array)) return callback(new Error('Collection must be an Array'));
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
        }, i);
      }
    };

    this.map = function (collection, iterator, callback) {
      if (collection == null) return callback(null, []);
      if (!(collection instanceof Array)) return callback(new Error('Collection must be an Array'));
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
        }, i);
      })(collection[i], i);
    };

    this.fold = function fold(collection, accumulator, iterator, callback, index) {
      if (collection == null) return callback(null, accumulator);
      if (!(collection instanceof Array)) return callback(new Error('Collection must be an Array'));
      if (index == null || index < 0) index = 0;
      if (index >= collection.length) return callback(null, accumulator);
      return iterator(collection[index], accumulator, function (err, accumulator) {
        if (err) return callback(err, accumulator);
        return fold(collection, accumulator, iterator, callback, index + 1);
      }, index);
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

    /*******************************************************/
    /***** Chain *******************************************/
    /*******************************************************/

    this.AST = new function () {

      var AST  = this;
      var NULL = function (alpha) { return alpha; };

      var assert = new function () {

        this.isIdentifier = function (identifier) {
          var identifierType = typeof identifier;
          if (identifierType == 'string' || identifierType == 'function') return ;
          throw new Error('Identifier must either be a string or a function');
        };

        this.isPath = function (path) {
          if (typeof path == 'string') return ;
          throw new Error('Path must be a string');
        };

        this.isCollection = function (source) {
          if (typeof source == 'string') return ;
          if (source == null) return ;
          if (source instanceof Array) return ;
          throw new Error('Source must be either null, a string or an Array');
        };

        this.isFqn = function (fqn) {
          if (typeof fqn == 'string') return ;
          throw new Error('Fqn must be a string');
        };

      };

      var util = new function () {

        this.getParentSyntaxes = function (parent) {
          if (parent == null) return [];
          if (parent.$syntaxes == null) return [];
          if (parent.$syntaxes.length == 0) return [];
          return parent.$syntaxes.slice();
        };

      };

      /** Waterfall */

      this.Waterfall = function (parent, end) {
        this.$current  = null;
        this.$ast      = NULL;
        this.$parent   = parent;
        this.$syntaxes = util.getParentSyntaxes(parent);
        if (parent != null && parent.$syntaxes) {
          for (var i = 0; i < parent.$syntaxes.length; i++) {
            var syntax = parent.$syntaxes[i];
            for (var m in syntax.module)
              this[syntax.prefix + '_' + m] = syntax.module[m];
          }
        }
        if (end) this.end = end;
      };

      this.Waterfall.prototype.$push = function (ast) {
        this.$current = ast;
        if (this.$ast === NULL)
          this.$ast = ast;
        else if (typeof this.$ast === 'object' && this.$ast.$ instanceof Array)
          this.$ast.$.push(ast);
        else
          this.$ast = { $: [this.$ast, ast] };
        return this;
      };

      this.Waterfall.prototype.$merger = function () {
        var self = Object.create(this);
        var merger = new AST.Merger(this);
        for (var method in merger) self[method] = merger[method];
        return self;
      };

      this.Waterfall.prototype.debug = function () {
        return this.$push(function (flow) { debugger; return flow; });
      };

      this.Waterfall.prototype.flow = (function () {
        var methods = { protect: true, copy: true };
        return function (method) {
          if (!methods[method]) throw new Error('Method ' + method + ' to alter flow not defined');
          return this.$push({ $: { type: 'alterFlow', method: method } });
        };
      })();

      this.Waterfall.prototype.relocate = function (location) {};

      this.Waterfall.prototype.as = function (glue) {
        return this.$push({ _: glue }).$merger();
      };

      this.Waterfall.prototype.put = function (glue) {
        return this.$push({ __: glue }).$merger();
      };

      this.Waterfall.prototype.then = function (identifier, glue) {
        assert.isIdentifier(identifier);
        var ast = { $: identifier };
        if (arguments.length > 1) ast._ = glue;
        return this.$push(ast).$merger();
      };

      this.Waterfall.prototype.apply = Yolo.Util.makeDeprecated(function (path, identifier) {
        assert.isPath(path);
        assert.isIdentifier(identifier);
        var ast = { $: identifier, _: '$:' + path };
        return this.$push(ast).$merger().merge(path);
      });

      this.Waterfall.prototype.defer = function (identifier, glue) {
        assert.isIdentifier(identifier);
        var block = { $: identifier };
        if (arguments.length > 1) block._ = glue;
        var ast = { $: { type: 'sideway', block: block } };
        return this.$push(ast);
      };

      /** Control Flow */

      this.Waterfall.prototype.Pipe = function () {
        return new AST.Waterfall(this, function () {
          return this.$parent.$push(this.$ast).$merger();
        });
      };

      this.Waterfall.prototype.Race = function (holder) {
        return new AST.Race(this, function () {
          return this.$parent.$push(this.$ast).$merger();
        }, holder);
      };

      this.Waterfall.prototype.Until = function (test, delay, glue) {
        if (arguments.length < 2) delay = 0;
        else delay |= 0;
        var hasGlue = arguments.length > 2;
        return new AST.Waterfall(this, function () {
          var ast = { $: { type: 'until', test: test, delay: delay, block: this.$ast } };
          if (hasGlue) ast.$.glue = glue;
          return this.$parent.$push(ast);
        });
      };

      this.Waterfall.prototype.Sideway = function () {
        return new AST.Waterfall(this, function () {
          var ast = { $: { type: 'sideway', block: this.$ast } };
          return this.$parent.$push(ast);
        });
      };

      /** Collection Iterator */

      this.Waterfall.prototype.Map = function (source) {
        assert.isCollection(source);
        return new AST.Waterfall(this, function () {
          var ast = { $: { type: 'map', source: source, block: this.$ast } };
          return this.$parent.$push(ast).$merger();
        });
      };

      this.Waterfall.prototype.Reduce = function (source) {
        assert.isCollection(source);
        return new AST.Waterfall(this, function () {
          var ast = { $: { type: 'reduce', source: source, block: this.$ast } };
          return this.$parent.$push(ast).$merger();
        });
      };

      this.Waterfall.prototype.Filter = function (source) {
        assert.isCollection(source);
        return new AST.Waterfall(this, function () {
          var ast = { $: { type: 'filter', source: source, block: this.$ast } };
          return this.$parent.$push(ast).$merger();
        });
      };

      this.Waterfall.prototype.Detect = function (source) {
        return new AST.Waterfall(this, function () {
          var ast = { $: { type: 'detect', source: source, block: this.$ast } };
          return this.$parent.$push(ast).$merger();
        });
      };

      this.Waterfall.prototype.Fold = function (accu, source) {
        assert.isCollection(source);
        return new AST.Waterfall(this, function () {
          var ast = { $: { type: 'fold', source: source, accu: accu, block: this.$ast } };
          return this.$parent.$push(ast).$merger();
        });
      };

      /** Flow routing */
      this.Waterfall.prototype.Match = function (view) {
        var hasView = arguments.length > 0;
        return new AST.Match(view, this, function () {
          var ast = { $: { type: 'match' } };
          if (hasView) ast.$.match = this.$view;
          ast.$.cases = this.$cases;
          ast.$.otherwise = this.$otherwise;
          return this.$parent.$push(ast).$merger();
        });
      };

      this.Waterfall.prototype.Unless = function (test) {
        return new AST.Waterfall(this, function () {
          var ast = { $: { type: 'unless', test: test, block: this.$ast } };
          return this.$parent.$push(ast);
        });
      };

      this.Waterfall.prototype.memoize = function (duration, key) {
        return new AST.Waterfall(this, function () {
          var ast = { $: { type: 'memoize', expire: duration, key: key, then: this.$ast } };
          var context = this.$parent.$push(ast);
          return context.end.apply(context, arguments);
        });
      };

      this.Waterfall.prototype.shunt = function (test, then) {
        return new AST.Waterfall(this, function () {
          var ast = { $: { type: 'shunt', test: test, then: then, block: this.$ast } };
          var context = this.$parent.$push(ast);
          return context.end.apply(context, arguments);
        });
      };

      this.Waterfall.prototype.trap = function (test, then) {
        return new AST.Waterfall(this, function () {
          if (typeof then == 'string') then = { $: then };
          var ast = { $: { type: 'trap', test: test, then: then, block: this.$ast } };
          var context = this.$parent.$push(ast);
          return context.end.apply(context, arguments);
        });
      };

      this.Waterfall.prototype.assert = function (test, glue, code) {
        var ast = { $: { type: 'assert', test: test, glue: glue, code } };
        return this.$push(ast);
      };

      this.Waterfall.prototype.failWith = function (message) {
        var ast = { $: { type: 'failWith', error: message } };
        return this.$push(ast);
      };

      this.Waterfall.prototype.Block = function (name) {
        return new AST.Waterfall(this, function () {
          var ast = { $: { type: 'block', name: name, block: this.$ast } };
          return this.$parent.$push(ast);
        });
      };

      this.Waterfall.prototype.Then = function (fqn, glue) {
        assert.isFqn(fqn);
        var ast = { $: fqn };
        if (arguments.length > 1) ast._ = glue;
        return new AST.MetaCall(this, function () {
          for (var key in this.$changes) break ;
          if (key) ast.$changes = this.$changes;
          return this.$parent.$push(ast).$merger();
        });
      };

      this.Waterfall.prototype.Require = function (fqn, name, lifetime) {
        assert.isFqn(fqn);
        if (lifetime == null) lifetime = -1;
        return new AST.Waterfall(this, function () {
          var ast = { $: { type: 'require'
                         , fqn: fqn, name: name, lifetime: lifetime
                         , data: this.$ast == NULL ? {} : this.$ast
                         }
                    };
          return this.$parent.$push(ast);
        });
      };

      /* Merger */
      this.Merger = function (parent) {
        this.$unwrapped = parent;
      };

      this.Merger.prototype.dismiss = function () {
        this.$current.$$ = { type: 'merge', mode: 'dismiss' };
        return this.$unwrapped;
      };

      this.Merger.prototype.wrap = function (glue) {
        this.$current.$$ = { type: 'merge', mode: 'wrap', glue: glue };
        return this.$unwrapped;
      };

      this.Merger.prototype.merge = function (path, glue) {
        if (arguments.length == 0) {
          this.$current.$$ = { type: 'merge', mode: 'root' };
        } else if (Yolo.Util.isObject(path)) {
          this.$current.$$ = { type: 'merge', mode: 'root', with: path };
        } else {
          this.$current.$$ = { type: 'merge', mode: 'into', to: path };
          if (arguments.length > 1) this.$current.$$.from = glue;
        }
        return this.$unwrapped;
      };

      this.Merger.prototype.replace = function (path) {
        this.$current.$$ = { type: 'merge', mode: 'set', to: path };
        return this.$unwrapped;
      };

      this.Merger.prototype.append = function (path) {
        this.$current.$$ = { type: 'merge', mode: 'push', to: path };
        return this.$unwrapped;
      };

      this.Merger.prototype.preprend = function (path) {
        this.$current.$$ = { type: 'merge', mode: 'unshift', to: path };
        return this.$unwrapped;
      };

      /* Race */
      this.Race = function (parent, end, holder) {
        this.$ast      = holder || {};
        this.$parent   = parent;
        this.$branches = [];
        this.$syntaxes = util.getParentSyntaxes(parent);
        this.end       = end;
      };

      this.Race.prototype.$isConflict = function (path) {
        var pattern = path + '.';
        for (var i = 0; i < this.$branches.length; i++) {
          var branch = this.$branches[i] + '.';
          if (branch.length < pattern.length) {
            if (branch.indexOf(pattern) === 0) return true;
          } else {
            if (pattern.indexOf(branch) === 0) return true;
          }
        }
        return false;
      };

      this.Race.prototype.At = function (path) {
        if (this.$isConflict(path))
          throw new Error('Race: ' + path + ' already locked by an other branch');
        var waterfall = new AST.Waterfall(this, function () {
          var context = this.$close();
          return context.end.apply(context, arguments);
        });
        waterfall.$close = function () {
          Yolo.Util.setIn(this.$parent.$ast, path, this.$ast);
          return this.$parent;
        };
        waterfall.At = function () {
          var self = this.$close();
          return self.At.apply(self, arguments);
        };
        return waterfall;
      };

      /* Match */
      this.Match = function (view, parent, end) {
        this.$view      = view;
        this.$cases     = [];
        this.$otherwise = null;
        this.$parent    = parent;
        this.$syntaxes  = util.getParentSyntaxes(parent);
        this.end        = end;
      };

      this.Match.prototype.$bind = function (waterfall) {
        var proto = AST.Match.prototype;
        for (var method in proto) {
          if (!proto.hasOwnProperty(method)) continue ;
          if (typeof proto[method] != 'function') continue ;
          (function (method) {
            waterfall[method] = function () {
              var parent = this.end(true);
              return parent[method].apply(parent, arguments);
            };
          })(method);
        }
      };

      this.Match.prototype.When = function (test) {
        var testType = typeof test;
        var type = testType == 'function' || testType == 'string' ? 'ast'
          : test instanceof RegExp ? 'regexp'
          : null;
        if (!type) throw new Error('Bad condition type');
        var waterfall = new AST.Waterfall(this, function () {
          this.$parent.$cases.push({ type: type, test: test, block: this.$ast });
          return this.$parent;
        });
        this.$bind(waterfall);
        return waterfall;
      };

      this.Match.prototype.WhenEquiv = function (value) {
        var waterfall = new AST.Waterfall(this, function (cont) {
          this.$parent.$cases.push({ type: 'compare', test: value, block: this.$ast });
          return cont ? this.$parent : this.$parent.end();
        });
        this.$bind(waterfall);
        return waterfall;
      };

      this.Match.prototype.WhenType = function () {
        var types = Array.prototype.slice.call(arguments);
        var waterfall = new AST.Waterfall(this, function (cont) {
          this.$parent.$cases.push({ type: 'kind-of', test: types, block: this.$ast });
          return cont ? this.$parent : this.$parent.end();
        });
        this.$bind(waterfall);
        return waterfall;
      };

      this.Match.prototype.Otherwise = function () {
        return new AST.Waterfall(this, function (cont) {
          this.$parent.$otherwise = this.$ast;
          return this.$parent.end.apply(this.$parent, arguments);
        });
      };

      /* Meta Call */
      this.MetaCall = function (parent, end) {
        this.$parent   = parent;
        this.$changes  = {};
        this.$syntaxes = util.getParentSyntaxes(parent);
        this.end       = end;
      };

      this.MetaCall.prototype.$Sequence = function (action, selector, glue) {
        if (this.$changes[selector] == null) this.$changes[selector] = {};
        if (this.$changes[selector][action] == null) this.$changes[selector][action] = {};
        else throw new Error('Operation already defined');
        var self = this;
        var change = this.$changes[selector][action];
        if (arguments.length > 2) change.glue = glue;
        var waterfall = new AST.Waterfall(this, function (level) {
          change.block = this.$ast;
          if (level === 0) return this.$parent;
          return this.$parent.end();
        });
        waterfall.Replace = function () { return this.end(0).Replace.apply(self, arguments); };
        waterfall.Prepend = function () { return this.end(0).Prepend.apply(self, arguments); };
        waterfall.Append  = function () { return this.end(0).Append.apply(self, arguments); };
        return waterfall;
      };

      this.MetaCall.prototype.Append = function (selector, glue) {
        var args = ['append', selector];
        if (arguments.length > 1) args.push(glue);
        return this.$Sequence.apply(this, args);
      };

      this.MetaCall.prototype.Prepend = function (selector, glue) {
        var args = ['prepend', selector];
        if (arguments.length > 1) args.push(glue);
        return this.$Sequence.apply(this, args);
      };

      this.MetaCall.prototype.Replace = function (selector, glue) {
        var args = ['replace', selector];
        if (arguments.length > 1) args.push(glue);
        return this.$Sequence.apply(this, args);
      };

    };

    /*******************************************************/
    /***** Runtime *****************************************/
    /*******************************************************/

    this.Runtime = function (node) {
      this.node = node.newest();
    };

    this.Runtime._getSource = function (flow, source) {
      if (source == null || source == '.') return flow;
      else if (typeof source == 'string') return Yolo.Util.getIn(flow, source);
      else if (source instanceof Array) return source;
      else return new Error('Bad source');
    };

    this.Runtime._resolveDynamicCall = function (ast, flow) {
      if (typeof ast.$ != 'string') return ast;
      if (!~ast.$.indexOf('{')) return ast;
      ast = Yolo.Util.inherit(ast);
      ast.$ = ast.$.replace(/(^|\.)\{(.+?)\}|(:)(\{(.+?)\})/g, function (_, pn, n, pm, m) {
        if (n) return pn + Yolo.Util.name(Yolo.Util.getIn(flow, n));
        if (m) return pm + Yolo.Util.method(Yolo.Util.getIn(flow, m));
        return null;
      });
      return ast;
    };

    this.Runtime.prototype._log = function (criticity, message) {
      this.node.send('Log:' + criticity, [this.node.fqn, message]);
    };

    // Main Handler
    this.Runtime.prototype.run = function (ast, payload, callback) {
      switch (Object.prototype.toString.call(ast)) {
      case '[object Object]':
        if ('$_' in ast) this._interrupt(ast.$_, payload);
        if ('$$' in ast) callback = this.wrapCallback(ast.$$, payload, callback);
        if ('$'  in ast) return this.execute(ast, payload, callback);
        if ('_'  in ast) return this.run(ast._, payload, callback);
        if ('__' in ast) return callback(null, ast.__);
        return this.parallelObject(ast, payload, callback);
      case '[object Function]':
        return this.call(ast, payload, callback);
      case '[object Array]':
        return this.parallelArray(ast, payload, callback);
      case '[object String]':
        return this.resolveDSL(ast, payload, callback);
      default :
        return callback(null, ast);
      }
    };

    // Pre action Handler
    this.Runtime.prototype._interrupt = function (options, data) {
      if (options.debug) debugger;
    };

    // Builtins
    this.Runtime.prototype.identity = function (ast, data, callback) {
      return callback(null, data);
    };

    this.Runtime.prototype.alterFlow = function (ast, payload, callback) {
      switch (ast.method) {
      case 'copy': return callback(null, Yolo.Util.copy(payload));
      case 'protect': return callback(null, Yolo.Util.inherit(payload));
      default: return callback(null, payload);
      }
    };

    this.Runtime.prototype.execute = function (ast, data, callback) {
      var runtime = this;
      ast = Yolo.VM.Runtime._resolveDynamicCall(ast, data);
      if ('_' in ast)
        return this.run(ast._, data, function (err, data) {
          if (err) return callback(err);
          return runtime.execute({ $: ast.$ }, data, callback);
        });
      switch (typeof ast.$) {
      case 'string': return this.nodeSend(ast, data, callback);
      case 'function': return this.call(ast.$, data, callback);
      case 'object':
        if (ast.$ == null) return this.parallelObject(ast, data, callback);
        if (ast.$ instanceof Array) return this.waterfall(ast.$, data, callback);
        if (ast.$.type != null && ast.$.type in this) return this[ast.$.type](ast.$, data, callback);
        return callback(new Error('Runtime: Unknown builtin: ' + ast.$.type));
      default: return this.parallelObject(ast, data, callback);
      }
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

    this.Runtime.prototype.nodeSend = function (ast, data, callback) {
      if (ast.$changes != null) {
        var changes = { names: ast.$changes, payload: data, next: this.__changes };
        return this.node.send(ast.$, changes, data, callback);
      } else if (this.__changes != null) {
        return this.node.send(ast.$, this.__changes, data, callback);
      } else {
        return this.node.send(ast.$, data, callback);
      }
    };

    this.Runtime.prototype.resolveDSL = function (dsl, data, callback) {
      var offset = dsl.indexOf(':');
      if (offset < 0) return callback(null, dsl);
      var scheme = dsl.substr(0, offset);
      if (scheme in Yolo.VM.DSL) {
        return Yolo.VM.DSL[scheme].call(this, dsl, data, callback);
      } else if (scheme in this.node.dsl) {
        return this.node.dsl[scheme].call(this.node, dsl, data, callback);
      } else {
        return callback(null, dsl);
      }
    };

    this.Runtime.prototype.block = (function () {
      var set = function (stack, operator, runtime, change, data, payload) {
        var slice = [];
        if ('glue' in change) {
          var glue = change.glue;
          slice.push(function (data, callback) {
            return runtime.run(glue, { super: payload, this: data }, callback);
          });
        }
        slice.push(change.block);
        Array.prototype[operator].apply(stack, slice);
      };
      return function (ast, data, callback) {
        if (this.__changes == null) return this.run(ast.block, data, callback);
        var before = [], current = [], after = [];
        var hasReplace = false;
        for (var layer = this.__changes; layer != null; layer = layer.next) {
          var changes = layer.names[ast.name];
          if (changes == null) continue ;
          if (changes.replace) hasReplace = true, before = [], current = [], after = [];
          if (changes.prepend) set(before, 'unshift', this, changes.prepend, data, layer.payload);
          if (changes.replace) set(current, 'push', this, changes.replace, data, layer.payload);
          if (changes.append) set(after, 'push', this, changes.append, data, layer.payload);
        }
        if (!hasReplace) current.push(ast.block);
        var waterfall = before.concat(current, after);
        if (waterfall.length == 1) return this.run(waterfall[0], data, callback);
        return this.run({ $: waterfall }, data, callback);
      };
    })();

    // Builtins about Control Flow
    this.Runtime.prototype.waterfall = function (workflow, data, callback) {
      var runtime = this;
      return Yolo.Async.fold(workflow, data, function (ast, accumulator, callback) {
        return runtime.run(ast, accumulator, callback);
      }, callback);
    };

    this.Runtime.prototype.until = function (ast, data, callback) {
      var format = 'glue' in ast ? 'run' : 'identity';
      return (function loop(runtime, ast, flow, times, callback) {
        var payload = { flow: flow, times: times };
        return runtime.run(ast.test, payload, function (err, result) {
          if (err) return callback(err);
          if (!result) return callback(null, flow);
          return runtime[format](ast.glue, payload, function (err, data) {
            if (err) return callback(err);
            return runtime.run(ast.block, data, function (err, flow) {
              if (err) return callback(err);
              if (ast.delay == 0) return loop(runtime, ast, flow, times + 1, callback);
              else return setTimeout(loop, ast.delay, runtime, ast, flow, times + 1, callback);
            });
          });
        });
      })(this, ast, data, 0, callback);
    };

    this.Runtime.prototype.parallelArray = function (list, data, callback) {
      var runtime = this;
      return Yolo.Async.map(list, function (schema, callback) {
        return runtime.run(schema, data, function (err, value) {
          if (err) {
            err = Yolo.Util.wrapError(err, schema);
            runtime._log('error', err);
            return callback(null, err);
          } else {
            return callback(null, value);
          }
        });
      }, callback);
    };

    this.Runtime.prototype.parallelObject = function (object, data, callback) {
      var result = {};
      var runtime = this;
      return Yolo.Async.each(Yolo.Util.keysOf(object), function (key, callback) {
        var work = object[key];
        return runtime.run(work, data, function (err, value) {
          if (err) {
            err = Yolo.Util.wrapError(err, work);
            runtime._log('error', err);
            result[key] = err;
          }
          else result[key] = value;
          return callback();
        });
      }, function (err) {
        return callback(err, result);
      });
    };

    this.Runtime.prototype.sideway = function (ast, data, callback) {
      Yolo.Util.defer(function (runtime) { return runtime.run(ast.block, data); }, this);
      return callback(null, data);
    };

    // Builtins about Collections
    this.Runtime.prototype.map = function map(ast, data, callback) {
      var runtime = this;
      var source = Yolo.VM.Runtime._getSource(data, ast.source);
      if (source instanceof Error) return callback(source);
      return Yolo.Async.map(source, function (value, callback, index) {
        var flow = { flow: data, key: index, value: value };
        return runtime.run(ast.block, flow, callback);
      }, callback);
    };

    // TODO: OBSOLETE: to be removed
    this.Runtime.prototype.each = function (ast, data, callback) {
      var runtime = this;
      return this.run(ast.source, data, function (err, source) {
        if (err) return callback(err);
        return Yolo.Async.each(source, function (item, callback, index) {
          var payload = {};
          for (var key in data) payload[key] = data[key];
          if (ast.key != null) payload[ast.key] = index;
          if (ast.as != null) payload[ast.as] = item;
          return runtime.run(ast.then, payload, function (err, result) {
            if (err) return callback(err);
            // should I merge result with data ?
            return callback();
          });
        }, function (err) {
          if (err) return callback(err);
          return callback(null, data);
        });
      });
    };

    this.Runtime.prototype.reduce = function reduce(ast, data, callback) {
      var runtime = this;
      var source = Yolo.VM.Runtime._getSource(data, ast.source).slice();
      if (source instanceof Error) return callback(source);
      if (source.length == 0) return callback(null, null);
      if (source.length == 1) return callback(null, source[0]);
      var batch = [];
      while (source.length >= 2) {
        var left = source.shift();
        var right = source.shift();
        batch.push({ flow: data, left: left, right: right });
      }
      return Yolo.Async.map(batch, function (subflow, callback) {
        return runtime.run(ast.block, subflow, callback);
      }, function (err, result) {
        if (err) return callback(err);
        while (source.length > 0) result.push(source.shift());
        return reduce.call(runtime, { source: result, block: ast.block }, data, callback);
      })
    };

    this.Runtime.prototype.fold = function fold(ast, data, callback) {
      var runtime = this;
      var source = Yolo.VM.Runtime._getSource(data, ast.source);
      if (source instanceof Error) return callback(source);
      var accu = Yolo.Util.copy(ast.accu);
      return Yolo.Async.fold(source, accu, function (value, accu, callback, index) {
        var flow = { flow: data, key: index, value: value, accu: accu };
        return runtime.run(ast.block, flow, callback);
      }, callback);
    };

    this.Runtime.prototype.filter = function filter(ast, data, callback) {
      var runtime = this;
      var source = Yolo.VM.Runtime._getSource(data, ast.source);
      if (source instanceof Error) return callback(source);
      var result = [];
      return Yolo.Async.each(source, function (value, callback, index) {
        var flow = { flow: data, key: index, value: value };
        return runtime.run(ast.block, flow, function (err, keep) {
          if (err) return callback(err);
          if (keep) result.push(value);
          return callback();
        });
      }, function (err) {
        return callback(err, result);
      });
    };

    this.Runtime.prototype.detect = function detect(ast, data, callback) {
      var runtime = this;
      var source = Yolo.VM.Runtime._getSource(ast.source, data);
      if (source instanceof Error) return callback(source);
      var succeeded = false;
      var lastError = null;
      return Yolo.Async.each(source, function (value, cb, index) {
        if (succeeded) return cb();
        var flow = { flow: data, key: index, value: value };
        return runtime.run(ast.block, flow, function (err, success) {
          if (err) lastError = err;
          if (succeeded) return cb();
          if (!success) return cb();
          succeeded = true;
          return callback(null, value);
        });
      }, function () {
        if (succeeded) return ;
        if (lastError) return callback(lastError);
        return callback(null, null);
      });
    };

    // Builtins about Flow Routing
    this.Runtime.prototype.match = (function () {
      var FOUND = {};
      var match = function (runtime, ast, flow, callback) {
        return Yolo.Async.fold(ast.cases, null, function (pattern, _, callback) {
          switch (pattern.type) {
          case 'ast':
            return runtime.run(pattern.test, ast.view, function (err, result) {
              if (err) return callback(err);
              if (result) return callback(FOUND, pattern.block);
              else return callback();
            });
          case 'compare':
            if (Yolo.Util.compare(pattern.test, ast.view) != 0) return callback();
            else return callback(FOUND, pattern.block);
          case 'regexp':
            if (!pattern.test.test(ast.view)) return callback();
            else return callback(FOUND, pattern.block);
          case 'kind-of':
            if (!Yolo.Util.inArray(pattern.test, Yolo.Util.kind(ast.view))) return callback();
            else return callback(FOUND, pattern.block);
          default:
            return callback(new Error('Pattern type unknown'));
          }
        }, function (err, block) {
          if (err === FOUND) return runtime.run(block, flow, callback);
          else if (err) return callback(err);
          return runtime.run(ast.otherwise, flow, callback);
        });
      };
      return function (ast, data, callback) {
        if (!(ast.cases instanceof Array)) {
          var list = [];
          for (var test in ast.cases)
            list.push({ type: 'ast', test: test, block: ast.cases[test] })
        } else {
          var list = ast.cases;
        }
        if (!('match' in ast)) {
          var param = { view: data, cases: list, otherwise: ast.otherwise };
          return match(runtime,param, data, callback);
        }
        var runtime = this;
        return this.run(ast.match, data, function (err, view) {
          if (err) return callback(err);
          var param = { view: view, cases: list, otherwise: ast.otherwise };
          return match(runtime, param, data, callback);
        });
      };
    })();

    this.Runtime.prototype.unless = function (ast, data, callback) {
      var runtime = this;
      return this.run(ast.test, data, function (err, result) {
        if (err) return callback(err);
        if (result) return callback(null, data);
        return runtime.run(ast.block, data, callback);
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

    this.Runtime.prototype.shunt = function (ast, data, callback) {
      var runtime = this;
      return runtime.run(ast.test, data, function (err, result) {
        if (err) return callback(err);
        if (result) {
          if (!('then' in ast)) return callback(null, data);
          return runtime.run(ast.then, data, callback);
        } else {
          return runtime.run(ast.block, data, callback);
        }
      });
    };

    this.Runtime.prototype.trap = function (ast, data, callback) {
      var runtime = this;
      return runtime.run(ast.block, data, function (error, result) {
        if (!error) return callback(null, result);
        var subflow = { error: error, flow: data };
        return runtime.run(ast.test, subflow, function (err, caught) {
          if (err) return callback(err);
          if (caught) return runtime.run(ast.then, subflow, callback);
          return callback(error);
        });
      });
    };

    this.Runtime.prototype.assert = function (ast, data, callback) {
      var runtime = this;
      return runtime.run(ast.test, data, function (err, succeed) {
        if (err) return callback(err);
        if (succeed) return callback(null, data);
        return runtime.run(ast.glue, data, function (err, error) {
          if (err) return callback(err);
          var result = Yolo.Util.wrapError(error);
          if (ast.code != null) result.code = ast.code;
          return callback(result);
        });
      });
    };

    this.Runtime.prototype.failWith = function (ast, data, callback) {
      if (ast.error) return callback(Yolo.Util.wrapError(ast.error));
      else return callback(data);
    };

    // Node Relative Call
    this.Runtime.prototype.require = (function () {
      var renewLifetime = function (parent, node, lifetime) {
        if (lifetime < 0) return ;
        var flag = node.get('_runtime.lifetime');
        if (flag) clearTimeout(flag);
        var name = node.name;
        flag = setTimeout(function () { parent.detachChild(node); }, lifetime | 0);
        node.set('_runtime.lifetime', flag);
      };
      return function (ast, data, callback) {
        var runtime = this;
        return runtime.run(ast.name, data, function (err, name) {
          if (err) return callback(err);
          name = Yolo.Util.name(name);
          var child = runtime.node.getChild(name);
          if (child != null) {
            renewLifetime(runtime.node, child, child.lifetime);
            return callback(null, data);
          }
          return runtime.run(ast.data, data, function (err, init) {
            if (err) return callback(err);
            var target = [runtime.node.cwd(), name].join('.');
            return runtime.node.create(ast.fqn, target, function (err, slice) {
              if (err) return callback(err);
              const dataNode = slice.leaf.oldest();
              dataNode.data = Yolo.Util.merge(dataNode.data, init);
              renewLifetime(runtime.node, slice.leaf, ast.lifetime);
              return callback(null, data);
            });
          });
        });
      };
    })();

    // Post action handler
    this.Runtime.prototype.wrapCallback = function (ast, payload, callback) {
      if (!(ast instanceof Array)) ast = [ast];
      for (var i = 0; i < ast.length; i++)
        callback = (function (runtime, method, payload, callback) {
          return function (error, result) {
            var data = { error: error, payload: payload, result: result };
            return runtime._post[method.type].call(runtime, method, data, callback);
          };
        })(this, ast[i], payload, callback);
      return callback;
    };

    // Post action definition
    this.Runtime.prototype._post = {};

    this.Runtime.prototype._post.merge = function merge(ast, data, callback) {
      if (data.error) return callback(data.error);
      switch (ast.mode) {
      case 'wrap':
        return this.run(ast.glue, data, callback);
      case 'root':
        if ('with' in ast) {
          return this.run(ast.with, data.result, function (err, value) {
            if (err) return callback(err);
            var result = Yolo.Util.merge(data.payload, value);
            return callback(null, result);
          });
        } else {
          var result = Yolo.Util.merge(data.payload, data.result);
          return callback(null, result);
        }
      case 'into':
        if ('from' in ast) {
          var runtime = this;
          return this.run(ast.from, data.result, function (err, result) {
            if (err) return callback(err);
            var nextAst = { type: 'merge', mode: 'into', to: ast.to };
            var payload = { payload: data.payload, result: result };
            return merge.call(runtime, nextAst, payload, callback);
          });
        } else {
          var result = Yolo.Util.merge(Yolo.Util.getIn(data.payload, ast.to), data.result);
          Yolo.Util.setIn(data.payload, ast.to, result);
          return callback(null, data.payload);
        }
      case 'set':
        Yolo.Util.setIn(data.payload, ast.to, data.result);
        return callback(null, data.payload);
      case 'dismiss':
        return callback(null, data.payload);
      case 'push': case 'unshift':
        debugger;
        var array = Yolo.Util.getIn(data.payload, ast.to);
        if (!(array instanceof Array)) array = [];
        array[ast.mode](data.result);
        Yolo.Util.setIn(data.payload, ast.to, array);
        return callback(null, data.payload);
      default:
        return callback(null, data.result);
      }
    };

    this.Runtime.prototype._post.void = function (ast, data, callback) {
      if (data.error != null) return callback(data.error);
      return callback(null, data.payload);
    };

    this.Runtime.prototype._post.trap = function (ast, data, callback) {
      if (data.error == null) return callback(data.error, data.result);
      if (data.error instanceof Error) data.message = data.error.message;
      if (ast.when == null) return this.run({ $: ast.then }, data, callback);
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


    /*******************************************************/
    /***** DSL *********************************************/
    /*******************************************************/

    this.DSL = new function () {

      this['='] = function (dsl, data, callback) {
        return callback(null, dsl.substr(2));
      };

      this['$'] = function (dsl, data, callback) {
        var query = dsl.substr(2);
        if (query == '@') return callback(null, data);
        return callback(null, Yolo.Util.getIn(data, query));
      };

      this['#'] = function (dsl, data, callback) {
        var query = dsl.substr(2);
        var value = this.node.get(query);
        return callback(null, value);
      };

      this['%'] = function (dsl, data, callback) {
        var runtime = this;
        var query = dsl.substr(2);
        var asyncs = [];
        var result = query.replace(/([=$%#&>])\{(.+?)\}/g, function (_, type, expr) {
          switch (type) {
          case '#': return runtime.node.get(expr);
          case '%': switch (expr) {
            case 'name': return runtime.node.name;
            case 'cwd': return runtime.node.cwd();
            default: return '';
          }
          case '&':
            var offset = expr.indexOf(':');
            var name = expr.substr(0, offset).split('.').reverse();
            var path = expr.substr(offset + 1);
            for (var node = runtime.node; node != null; node = node.parent) {
              if (node.require == null) continue ;
              if (node.require.configs == null) continue ;
              var configs = node.require.configs;
              for (var i = 0; i < path.length; i++) {
                var slot = name.slice(i).reverse().join('.');
                if (i > 0) slot += '.*';
                if (configs[slot] == null) continue ;
                var value = Yolo.Util.getIn(configs[slot], path);
                if (value == null) continue ;
                return value;
              }
            }
            return '';
          case '$': return Yolo.Util.getIn(data, expr);
          case '=': return expr;
          case '>':
            var separator = '\0yljs\0';
            var tag = separator + Yolo.Util.id() + separator;
            asyncs.push({ ast: { $: expr }, tag: tag });
            return tag;
          default: return '';
          }
        });
        if (asyncs.length > 0) return (function loop(runtime, result, asyncs) {
          var replacement = asyncs.shift();
          if (replacement == null) return callback(null, result);
          return runtime.run(replacement.ast, data, function (err, value) {
            if (err) return callback(err);
            var rewrite = result.replace(replacement.tag, value);
            return loop(runtime, rewrite, asyncs);
          });
        })(this, result, asyncs);
        return callback(null, result);
      };

    };

    /*******************************************************/
    /***** Flux ********************************************/
    /*******************************************************/

    this.Flux = new function () {

      this.create = function (handler) {
        var flux = function flux(error, success) {
          if (error != null) return flux.emit('fail', error);
          if (arguments.length < 2) { debugger; throw new Error('should not responde without args'); }
          return flux.emit('success', success);
        };
        flux.emit    = _emit;
        flux.has     = _has;
        // TODO: Check if no handler
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

    /*******************************************************/
    /***** Handler *****************************************/
    /*******************************************************/

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
        try { return parser.parse(string); }
        catch (e) {
          try { console.warn(string); } catch (e) {}
          throw e;
        }
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
    this.dsl      = {};

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
      if (Yolo.Util.isObject(arguments[0])) {
        var scope = arguments[0];
        for (var fqn in scope) this.register(fqn, scope[fqn]);
      } else {
        throw new Error('Unhandled prototype call')
      }
    } else if (arguments.length == 2) {
      var structure = arguments[1];
      if (Yolo.Util.isObject(structure)) {
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
            } else if (Yolo.Util.isObject(target[chain[0]])) {
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
    } else if (typeof path == 'string') {
      var chain = ('' + path).split('.');
      older: for (var node = this; node != null; node = node.older) {
        for (var i = 0, l = chain.length, obj = node.data; i < l; ++i) {
          obj = obj[chain[i]];
          if (obj == null) continue older;
        }
        return obj;
      }
    } else if (Yolo.Util.kind(path) == 'Array') {
      var result = {};
      for (var i = 0; i < path.length; i++)
        Yolo.Util.setIn(result, path[i], this.get(path[i]));
      return result;
    } else {
      return null;
    }
  };

  this.Node.prototype.set = function (path, value) {
    var chain = ('' + path).split('.');
    var data = this.data;
    while (chain.length > 0) {
      if (chain.length == 1) {
        data[chain.shift()] = value;
      } else if (Yolo.Util.isObject(data[chain[0]])) {
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
      } else if (Yolo.Util.isObject(data[chain[0]])) {
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
    if (arguments.length == 0)
      return this.model.kind || (this.older && this.older.kind()) || null;
    this.model.kind = kind;
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
    if (this.model.fields == null && this.model.kind == null) this.kind('Record');
    if (!Yolo.Util.isObject(options)) options = { name: name, fqn: fqn, required: !!options };
    if (arguments.length < 1) return this.fold(function (layout, fields) {
      if (layout.model.fields == null) return fields;
      var set = [];
      for (var field in layout.model.fields)
        if (!~fields.indexOf(field))
          set.push(field);
      return set.concat(fields);
    }, []);
    if (arguments.length < 2) {
      var field = this.model.fields && this.model.fields[name];
      return field || (this.older && this.older.field(name)) || null;
    }
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

  this.Node.prototype.begin = function (payload) {
    var hasPayload = arguments.length > 0;
    var runtime = new Yolo.VM.Runtime(this);
    return new Yolo.VM.AST.Waterfall(null, function (data, callback) {
      if (hasPayload) {
        if (arguments.length > 1) throw new Error('Payload has been defined twice');
        callback = data;
        if (typeof callback != 'function') throw new Error('This call requires a callback');
        return runtime.run(this.$ast, payload, callback);
      } else if (arguments.length > 1) {
        return runtime.run(this.$ast, data, callback);
      } else if (arguments.length < 1) {
        return this.$ast;
      } else {
        throw new Error('This call requires a payload and a callback');
      }
    });
  };

  this.Node.prototype.on = function (name, ast) {
    if (this.inlets.hasOwnProperty(name)) throw new Error('Method: ' + name + ' already bound');
    switch (arguments.length) {
    case 1:
      var node = this;
      var error = new Error('Procedure not ended');
      Yolo.Util.defer(function () { if (error) throw error; });
      return new Yolo.VM.AST.Waterfall(null, function () {
        error = null;
        node.inlets[name] = this.$ast;
        return node;
      });
    case 2:
      this.inlets[name] = ast;
      return this;
    default:
      throw new Error('Unknown how to handle ' + arguments.length + ' arguments');
    }
  };

  this.Node.prototype.emit = function (inletName, payload, callback) {
    return this.send([{ type: 'inlet', name: inletName }], payload, callback);
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

  this.Node.prototype.getNode = function (pattern) {
    if (pattern.charAt(0) == '.') return this.getChild(pattern.substr(1));
    var node = this;
    while (node.parent) node = node.parent;
    return this.getChild(pattern);
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
      var msg = 'Child with the same name "' + name + '" already attached at ' + this.cwd();
      this.send('Log:warn', msg);
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

  this.Node.prototype.send = function (fqn/*, changes*/, payload, callback) {
    if (typeof payload == 'function')
      this.send('Log:warn', this.cwd() + ' calls ' + fqn + ' without callback !');
    if (typeof fqn == 'string') fqn = Yolo.Fqn.parse(fqn);
    if (arguments.length == 4) {
      fqn[fqn.length - 1].changes = payload;
      payload = callback;
      callback = arguments[3];
    }
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
        while (pending[fqn] && pending[fqn].length > 0)
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
      if (err) return event.handler(err);
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
    } else {
      this._create(event, slice);
    }
    if (event.error) this.send('Log:error', event.error);
  };

  this.Node.prototype._inlet = function (event, slice) {
    var runtime = new Yolo.Node.InletRuntime(this, slice.name, slice.changes);
    var flux  = Yolo.VM.Flux.create(event.handler);
    return runtime.super(event.payload, flux);
  };

  this.Node.InletRuntime = function (node, name, changes) {
    Yolo.VM.Runtime.call(this, node);
    this.__next    = node;
    this.__name    = name;
    this.__changes = changes;
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
