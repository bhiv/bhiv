var moment  = require('moment');
var Bhiv    = require('bhiv');

module.exports = new function () {

  this.Jade = new function () {
    var Runtime = this;
    var node = toplevel.Root;

    var toolbox = {};
    toolbox.moment = moment;
    toolbox.slugify = Yolo.Util.slugify;
    toolbox.id = Yolo.Util.id;

    this.render = function (inlet, payload) {
      var node = inlet.node;
      var scope = { id: node.id, node: node, children: payload.children || {}
                  , tags: [], data: null, params: payload.params || {}
                  , http: (payload.params || {})._http
                  , _: toolbox
                  };

      node.inspect(function (elder) {
        if (elder.layout != null) scope.tags.push(elder.layout);
        Array.prototype.push.apply(scope.tags, elder.tags);
      });

      var data = node.get();
      data = Yolo.Util.merge(data, payload.data);
      data = Bhiv.extract(data, scope);
      scope.data = data;

      scope.tags = scope.tags
        .map(Yolo.Util.slugify)
        .filter(function (value, index, self) { return self.indexOf(value) === index; })
      ;

      scope.invoke = function (fqn, data, childName) {
        if (childName == null) childName = 'X_' + Yolo.Util.id(4);
        return ['', childName, fqn, Yolo.Util.serialize(data, true), childName, ''].join('%');
      };

      try { return inlet.producer(scope); }
      catch (e) { throw Yolo.Util.wrapError(e, inlet.source); }
    };

    this.producer = function (inlet, payload, controller) {
      var result = Runtime.render(inlet, payload);
      return (function loop(source, payload, controller) {
        var match = /%([A-Z][a-z0-9_]*)%([a-z0-9.\-:]+)%(.+?)%\1%/i.exec(source);
        if (match == null) return controller.reply('end', source);
        var start = source.substr(0, match.index);
        var end = source.substr(match.index + match[0].length);
        var callback = function (err, data) {
          if (err) return controller.reply(err);
          var result = [start, data.html, end].join('');
          if (data.instance) inlet.node.attach(data.instance, match[1]);
          for (var layout in data.styles) break ;
          // FIXME: if Yolo.Event.reply become asynchronous
          if (layout != null) controller.reply('styles', data.styles);
          return loop(result, payload, controller);
        };
        if (match[2].indexOf(':') == 0) {
          try { var data = { data: JSON.parse(match[3]) }; }
          catch (e) { logger.warn(Yolo.Util.wrapError(e, match[3])); }
          if (data == null) data = {};
          if (payload.params != null) data.params = payload.params;
          if (payload.children != null) data.children = payload.children;
          return inlet.node.execute(match[2].substr(1), data, function (err, result) {
            if (err) return callback(err);
            if (result instanceof Yolo.Node) {
              var flow = { instance: result, params: payload.params };
              // FIXME
              logger.warn('Need a fix here');
              return node.send('Yolo.Ui.Builder:execute', flow, callback);
            } else {
              return callback(null, { html: result });
            }
          });
        } else {
          var override = JSON.parse(match[3]);
          var flow = { fqn: match[2], params: payload.params, override: override };
          // FIXME
          logger.warn('Need a fix here');
          return node.send('Yolo.Ui.Builder:compute', flow, callback);
        }
      })(result, payload, controller);
    };

  };

};