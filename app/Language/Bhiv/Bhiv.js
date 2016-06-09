var Bhiv  = require('bhiv');

module.exports = function (node) {

  var rules = {};
  rules.extract = function (params) {
    this.result = JSON.parse(this.value, function (k, value) {
      if (typeof value != 'string') return value;
      var single = null;
      value = value.replace(/^\$\{([^\}]+)\}$|\$\{([^\}]+)\}/g, function (_, p1, p2) {
        var result = _;
        if (p1 != null) single = result;
        var path = p1 || p2;
        if (path.indexOf('config.') == 0) {
          path = path.substr('config.'.length);
          for (var key in toplevel.Config) {
            if (key == path) result = toplevel.Config[key];
            else if (path.indexOf(key + '.') != 0) continue ;
            else result = Bhiv.getIn(toplevel.Config[key], path.substr(key.length + 1));
            if (result != null) break ;
          }
        } else if (path.indexOf('params.') == 0) {
          result = Bhiv.getIn({ params: params }, path);
        } else if (path.indexOf('data.') == 0) {
          result = node.get(path.substr('data.'.length));
        }
        if (single != null) single = result;
        return result;
      });
      return single || value;
    });
  };

  node.on('parse-rule', function (query, event) {
    var inlet = {};
    var rule = query.rule;
    var structure = query.structure;
    if (structure.inlets == null) structure.inlets = {};
    if (structure.inlets.init == null) structure.inlets.init = [];
    structure.inlets.init.push(inlet);
    inlet.value = rule.value;
    inlet.args = rule.args;
    inlet.result = null;
    inlet.call = function (params, event) {
      var node = this.node;
      if (this.args.length == 1) this.args.unshift('extract');
      if (this.args.length >= 2) rules[this.args[0]].call(this, params);
      return this.setter(null, event);
    };
    inlet.setter = function (_, event) {
      if (this.args[0] == 'extract') this.node.set(this.args[1], this.result);
      return event.reply();
    };
    inlet.serialize = function () {
      var inlet = {};
      inlet.args = this.args;
      inlet.result = this.result;
      inlet.call = this.setter;
      return Yolo.Util.serialize(inlet);
    };
    return event.reply();
  });

};