import Parser from './Routing.parser.pegjs';

export default function (node, logger, Bee) {

  node.on('init', function (_, callback) {
    var routes = this.node.get('routes');
    return new Bee()
      .Map('routes', null, 'filepath')
      .  pipe(':route-map-add', '${filepath}')
      .close({ max: 1 })
      .end({ routes: routes }, callback);
  });

  node.on('route-map-add', new Bee()
          .extract({ filepath: '${.}' })
          .then('Yolo.Util.Retriever:request', '${filepath}', { raw: '${.}' })
          .then(':parse', '${raw}', { rules: '${.}' })
          .pipe(':config-attach')
          .Map('rules', null, 'rule')
          .  then(':rule-add', '${rule}', {})
          .close({ max: 1 })
          .end()
         );

  node.on('parse', function (content, callback) {
    try { var rules = Parser.parse(content); }
    catch (e) { debugger; return callback(Yolo.Util.wrapError(e, content)); }
    return callback(null, rules);
  });

  node.on('config-attach', function (flow, callback) {
    var match = /(\d+)\.map$/.exec(flow.filepath);
    if (!match) return callback(null, flow);
    for (var i = 0; i < flow.rules.length; i++) {
      var rule = flow.rules[i];
      rule.config = {};
      rule.config.port = parseInt(match[1], 10);
    }
    return callback(null, flow);
  });

  node.on('rule-add', function (rule, callback) {
    if (rule.id == null) rule.id = Yolo.Digest(rule).substr(0, 8);
    var render = rule.render;
    rule.outlet = rule.id;
    if (this.node.getChild(rule.name) == null) {
      return this.node.create(rule._type, (err, result) => {
        if (err) return callback(err);
        this.node.attach(result.leaf, rule.name);
        return this.node.emit('adapter-add-rule', rule, callback);
      });
    } else {
      return this.node.emit('adapter-add-rule', rule, callback);
    }
  });

  node.on('adapter-add-rule', function (rule, callback) {
    var node = this.node;
    var handler = Yolo.Flux.extend(callback, new function () {

      this.request = (payload) => {
        payload.render = rule.render;
        return node.getChild(rule.name).send(rule.render.path, payload, (err, output) => {
          if (err) {
            payload.error = err;
            return node.emit('production-error', payload);
          }
          payload.output = output;
          node.send(rule.name, 'response', payload, (err) => {
            if (err) {
              payload.error = err;
              return node.emit('reponse-error', payload);
            } else {
              return /* page successfully rendered */ ;
            }
          });
        });
      };

    });

    return this.node.send(rule.name, 'handle-' + rule.handle, rule, handler);
  });

  node.on('production-error', function (payload, callback) {
    var error = payload.error;
    var rulename = payload.http.config.outlet;
    var source = error.source != null ? '\n--\n' + error.source : '';
    logger.error('Production error [' + rulename + '] %s%s', error, source);
    var method = /not found/i.test(error.toString()) ? 'response-notfound' : 'response-error';
    var data = { _response: payload.http.response, message: error.toString() };
    // FIXME: do not send to "Http" but to the request handler
    return this.node.send('Http', method, data, callback);
  });

  node.on('response-error', function (payload, callback) {
    var error = payload.error;
    var rulename = payload.http.config.outlet;
    logger.error('Response error [' + rulename + '] %s', error);
    var method = 'response-error';
    var data = { _response: payload.http.response, message: error.toString() };
    // FIXME: do not send to "Http" but to the request handler
    return this.node.send('Http', method, data, callback);
  });

};

