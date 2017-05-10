/*!UroxGvT3uDMQCT1va20i43ZZSxo*/
import Parser from './Router.parser.pegjs';

export default function (node, logger) {

  node.on('-start')
    .as({ node: '$:@' })
    .then(function (flow) { return this.node.get('routes'); }).merge('routes')
    .Map('routes')
    .  then(':route-map-add', '$:value')
    .  end()
    .end();

  node.on('route-map-add')
    .as({ filepath: '$:@' })
    .then('Util.Retriever:request', '$:filepath').merge('raw')
    .then(':parse', '$:raw').merge('rules')
    .then(':config-attach')
    .Map('rules')
    .  then(':rule-add', '$:value')
    .  end()
    .end();

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
        return this.node.send(':adapter-add-rule', rule, callback);
      });
    } else {
      return this.node.send(':adapter-add-rule', rule, callback);
    }
  });

  node.on('adapter-add-rule', function (rule, callback) {
    const node = this.node;
    const childName = '.' + rule.name;
    const fqn = [childName, 'handle-' + rule.handle].join(':');
    return this.node.send(fqn, rule, new function () {

      this.callback = callback;

      this.request = (payload) => {
        payload.render = rule.render;
        return node.getChild(rule.name).send(rule.render.path, payload, (err, output) => {
          if (err) {
            payload.error = err;
            return node.send(':production-error', payload);
          }
          payload.output = output;
          return node.send(childName + ':response', payload, (err) => {
            if (err) {
              payload.error = err;
              return node.send(':reponse-error', payload);
            } else {
              return /* page successfully rendered */ ;
            }
          });
        });
      };

    });
  });

  node.on('production-error', function (payload, callback) {
    var error = Yolo.Util.wrapError(payload.error);
    var rulename = payload.http.config.outlet;
    var source = error.source != null ? '\n--\n' + error.source : '';
    logger.error('Production error [' + rulename + '] %s%s', error, source);
    var method = /not found/i.test(error.toString()) ? 'response-notfound' : 'response-error';
    var data = { _response: payload.http.response, message: error.toString() };
    // FIXME: do not send to "Http" but to the request handler
    return this.node.send('.Http:' + method, data, callback);
  });

  node.on('response-error', function (payload, callback) {
    var error = payload.error;
    var rulename = payload.http.config.outlet;
    logger.error('Response error [' + rulename + '] %s', error);
    var method = 'response-error';
    var data = { _response: payload.http.response, message: error.toString() };
    // FIXME: do not send to "Http" but to the request handler
    return this.node.send('.Http:' + method, data, callback);
  });

};

