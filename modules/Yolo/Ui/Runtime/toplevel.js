window.toplevel = new function () {
  this.side = 'client';
  this.window = window;
  this.Root = null;
  this.modules = {};
  this.runtimes = {};
  this.register = function (name, mod) { toplevel.modules[name] = mod; };
  this.options = { apl: false // Asynchronous Page Loading
                 };
};

window.require = function (name) {
  if (name in toplevel.modules) return toplevel.modules[name];
  var filename = (/([a-z0-9.\-_]+)\.js$/i.exec(name) || [])[1];
  if (filename == null) return null;
  if (filename in toplevel.modules) return toplevel.modules[filename];
  return null;
};

jQuery(window.document).on('click submit mouseup mousedown mousewheel', function (e) {
  var dom = e.target;
  do {
    var node = Yolo.Ui.getParentNode(dom);
    if (node == null) break ;
    var handlers = node.get('event.' + e.type);
    if (handlers != null) {
      if (typeof handlers == 'function') handlers = [handlers];
      if (!(handlers instanceof Array)) return ;
      for (var i = 0; i < handlers.length; i++)
        handlers[i].call(e.target, node, e);
    }
    dom = node.get('dom');
    if (dom == null) break ;
    dom = dom.parentNode;
  } while (node);
});

jQuery(window).on('message', function (e) {
  debugger;
});

jQuery.fn.getFormData = function () {
  var data = {};
  this.find('select,input,textarea').each(function () {
    if (this.name == null) return ;
    var path = this.name.replace(/\]\[|\[/g, '.').replace(/\]$/, '');
    if (this.type == 'radio' || this.type == 'checkbox') {
      if (!this.checked && Bhiv.getIn(data, path) == null) {
        Bhiv.setIn(data, path, '');
        return ;
      }
    }
    Bhiv.setIn(data, path, jQuery(this).val());
  });
  return data;
};
