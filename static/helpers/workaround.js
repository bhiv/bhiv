if (typeof setImmediate == 'undefined') {
  window.setImmediate = function (fn) {
    var args = arguments.length > 1 ? Array.prototype.slice.call(arguments, 1) : [];
    return setTimeout(function () { return fn.apply(this, args); }, .01);
  };
}

if (!Object.keys) {
  Object.keys = function(obj) {
    var keys = [];
    for (var i in obj)
      if (obj.hasOwnProperty(i))
        keys.push(i);
    return keys;
  };
}

if (!Object.create) {
  var createEmpty;
  var supportsProto = !({__proto__:null} instanceof Object);
  var shouldUseActiveX = function shouldUseActiveX() {
    if (!document.domain) { return false }
    try { return !!new ActiveXObject("htmlfile") }
    catch (a) { return false }
  };
  var getEmptyViaActiveX = function getEmptyViaActiveX() {
    var b;
    var a;
    a = new ActiveXObject("htmlfile");
    a.write("<script><\/script>");
    a.close();
    b = a.parentWindow.Object.prototype;
    a = null;
    return b
  };
  var getEmptyViaIFrame = function getEmptyViaIFrame() {
    var b = document.createElement("iframe");
    var a = document.body || document.documentElement;
    var c;
    b.style.display = "none";
    a.appendChild(b);
    b.src = "javascript:";
    c = b.contentWindow.Object.prototype;
    a.removeChild(b);
    b = null;
    return c
  };
  if (supportsProto || typeof document === "undefined") {
    createEmpty = function () { return {__proto__: null} }
  } else {
    createEmpty = function () {
      var b = shouldUseActiveX() ? getEmptyViaActiveX() : getEmptyViaIFrame();
      delete b.constructor;
      delete b.hasOwnProperty;
      delete b.propertyIsEnumerable;
      delete b.isPrototypeOf;
      delete b.toLocaleString;
      delete b.toString;
      delete b.valueOf;
      var a = function a() {};
      a.prototype = b;
      createEmpty = function () { return new a() };
      return new a()
    }
  }
  Object.create = function create (c,d) {
    var b;
    var a = function a(){};
    if (c === null) { b = createEmpty() }
    else {
      if (typeof c !== "object" && typeof c !== "function") {
        throw new TypeError("Object prototype may only be an Object or null")
      }
      a.prototype = c;
      b = new a();
      b.__proto__=c
    }
    if (d !== void 0) {
      Object.defineProperties(b,d)
    }
    return b
  }
}

if (typeof String.prototype.trim == 'undefined') {
  String.prototype.trim = function (pattern) {
    return this.replace(pattern || /^\s+|\s+$/g, '');
  };
}

if (typeof Array.prototype.map == 'undefined') {
  Array.prototype.map = function(i, h) {
    var b, a, c;
    if (this == null) throw new TypeError(" this est null ou non défini");
    var e = Object(this);
    var f = e.length >>> 0;
    if (typeof i !== "function") throw new TypeError(i+" n est pas une fonction");
    if (arguments.length > 1) b = h;
    a = new Array(f);
    c = 0;
    while (c < f) {
      var d, g;
      if (c in e) {
        d = e[c];
        g = i.call(b, d, c, e);
        a[c] = g;
      }
      c++;
    }
    return a;
  };
}