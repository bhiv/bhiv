toplevel.Root = new Yolo.Node('ClientSide', 'root', ['browser']);

Yolo.Data = new function () {
  this.request = (function () {
    var pending = {};
    return function (fqn, callback) {
      if (pending[fqn] != null) return pending[fqn].push(callback);
      pending[fqn] = [callback];
      var success = function (js) {
        var filename = 'resource/' + fqn + '.js';
        var callbacks = pending[fqn];
        pending[fqn] = null;
        try {
          var data = new Function ('', 'return ' + js + ';\n//# sourceURL=' + filename)();
        } catch (e) {
          while (callbacks.length > 0) callbacks.shift()(e);
          return ;
        }
        while (callbacks.length > 0) callbacks.shift()(null, data);
        return ;
      };
      return void jQuery.ajax( { url: './resource/' + fqn, type: 'get', dataType: 'text'
                               , success: success, error: callback
                               }
                             );
    };
  })();
};

Yolo.Ui = new function () {
  var Ui = this;

  var mapping = {};

  this.display = function (fqn, data, holder, callback) {
    if (arguments.length < 4) { callback = holder; holder = null; }
    if (data == null) data = {};
    if (holder == null) return Ui.loadPage(fqn, data, callback);
    if (callback == null) callback = Yolo.noop;
    return Ui.require(fqn, function (err, fqn) {
      if (err) return callback(err);
      return Ui.render(fqn, data, function (err, instance) {
        if (err) return callback(err);
        return Ui.apply(holder, instance, function (err) {
          if (err) return callback(err);
          debugger;
        });
      });
    });
  };

  this.loadPage = (function () {
    var makeForm = function (url, data) {
      var form = document.createElement('form');
      form.style.display = 'hidden';
      form.method = 'post';
      form.action = url;
      insertFields(form, [], data);
      return form;
    };
    var makeInput = function (path, value) {
      var input = document.createElement('input');
      input.type = 'hidden';
      input.name = makeInputName(path);
      input.value = value;
      return input;
    };
    var makeInputName = function (path) {
      if (!path || !(path.length > 0)) throw new Error('Bad argument');
      if (path.length == 1) return path[0];
      if (path.length == 2) return path[0] + '[' + path[1] + ']';
      return path.shift() + '[' + path.map(escape).join('][') + ']';
    };
    var insertFields = function walk(form, path, data) {
      switch (Object.prototype.toString.call(data)) {
      case '[object Object]':
        for (var field in data) walk(form, path.concat(field), data[field]);
        break ;
      case '[object Array]':
        for (var i = 0; i < data.length; i++) walk(form, path.concat(i), data[field]);
        break ;
      case '[object String]': case '[object Number]':
      case '[object Boolean]': case '[object Null]':
        form.appendChild(makeInput(path, new String(data)));
        break ;
      }
    };
    return function (fqn, data, callback) {
      if (toplevel.options.apl === false) {
        var url = '/' + fqn.split(/\./).map(Yolo.Util.slugify).join('/');
        for (var hasData in data) break ;
        if (hasData == null) {
          return void (window.location = url);
        } else {
          var form = makeForm(url, data);
          document.body.appendChild(form);
          return void form.submit();
        }
      } else {
        return Ui.display(fqn, data, document.body, callback);
      }
    };
  })();

  this.require = function (fqn, callback) {
    if (callback == null) callback = Yolo.noop;
    if (fqn in mapping) return callback(null, mapping[fqn]);
    return Yolo.Data.request(fqn, function (err, data) {
      if (err) return callback(err);
      for (var fqn in data.scope) Yolo.Data.set(fqn, data.scope[fqn]);
      mapping[fqn] = data.fqn;
      return callback(null, data.fqn);
    });
  };

  this.render = function (fqn, data, callback) {
    var instance = new Yolo.Node('ClientSide').inflate(fqn);
    return callback(null, instance);
  };

  this.apply = function (holder, instance, callback) {
    if (holder.firstChild == null || holder.firstChild.yolo == null || true) {
      return Ui.clear(holder, function (err, holder) {
        if (err) return callback(err);
        return Ui.produce(instance, holder, function (err, dom) {
          if (err) return callback(err);
          holder.appendChild(dom);
          return callback(null, dom);
        });
      });
    } else {
      // TODO: diff resolve
    }
  };

  this.clear = function (dom, callback) {
    // TODO: trigger unload event;
    dom.innerHTML = '';
    return callback(null, dom);
  };

  this.produce = function (instance, callback) {
    // TODO: 
    return instance.mapreduce(function (instance, data, cb) {
      if (instance.hasInlet('html')) {

      } else {

      }
    }, function (children) {
      debugger;
    }, function (err, result) {
      debugger;
    });
  };

  this.getParentNode = function (dom) {
    while (dom != null) {
      if (dom.yolo) break ;
      dom = dom.parentNode;
    }
    if (!dom) return null;
    return dom.yolo;
  };

  this.getNextDomNode = function (dom) {
    if (dom.childNodes.length > 0)
      return dom.childNodes[0];
    while (dom) {
      if (dom.nextSibling)
        return dom.nextSibling;
      dom = dom.parentNode;
    }
    return null;
  };

  this.overload = function (dom) {

    jQuery(dom).find('[x-bind]').each(function () {
      var bind = this.getAttribute('x-bind');
      this.removeAttribute('x-bind');
      var match = /^([a-z]+):([a-z0-9.]*:[a-z_\-]+)(?::(.+))?$/i.exec(bind);
      if (!match) return console.warn('binding fail:', bind);
      var fqn = match[2];
      var glue = match[3] != null ? JSON.parse(match[3]) : null;
      jQuery(this).on(match[1], function (e) {
        var node = Yolo.Ui.getParentNode(this);
        if (node == null) return ;
        var data = { dom: this, event: e };
        if (glue != null) data = Bhiv.extract(glue, data);
        return node.send(fqn, data);
      });
    });

  };

};

/**/

jQuery(function () { Yolo.Ui.overload(document.body) });
