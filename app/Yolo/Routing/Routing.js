var Bhiv   = require('bhiv');
var Parser = require('./Routing.parser.js');

module.exports = function (node) {
  var Bee  = new Bhiv(node.createInvoke(), node.data).Bee;

  node.on('set', new Bee()
          .extract({ filepath: '${.}' })
          .then('Yolo.Util.Retriever:request', '${filepath}', { raw: '${.}' })
          .then(':parse', '${raw}', { rules: '${.}' })
          .pipe(':config-attach')
          .Map('rules', null, 'rule')
          .  then(':rule-add', '${rule}', {})
          .close({ max: 1 })
          .end()
         );

  node.on('parse', function (content, event) {
    try { var rules = Parser.parse(content); }
    catch (e) { return event.reply('fail', Yolo.Util.wrapError(e, content)); }
    return event.reply('done', rules);
  });

  node.on('config-attach', function (flow, event) {
    var match = /(\d+)\.map$/.exec(flow.filepath);
    if (!match) return event.reply(null, flow);
    for (var i = 0; i < flow.rules.length; i++) {
      var rule = flow.rules[i];
      rule.config = {};
      rule.config.port = parseInt(match[1], 10);
    }
    return event.reply(null, flow);
  });

  node.on('rule-add', function (rule, event) {
    if (rule.id == null) rule.id = Yolo.Digest(rule).substr(0, 8);
    var render = rule.render;
    rule.outlet = rule.id;
    if (node.getChild(rule.name) == null) {
      return node.create('Modules', rule._type, rule.name, function (err) {
        if (err) return event.reply('fail', err);
        return node.emit('adapter-add-rule', rule, event);
      });
    } else {
      return node.emit('adapter-add-rule', rule, event);
    }
  });

  node.on('adapter-add-rule', function (rule, event) {
    return node.send(rule.name, 'handle-' + rule.handle, rule, new function () {
      this.done = function (payload) { return event.reply('done', payload); };
      this.fail = function (error) { return event.reply('fail', error); };
      this.request = function (payload) {
        payload.render = rule.render;
        node.send(rule.render._type, 'produce', payload, function (err, output) {
          if (err) {
            payload.error = err;
            return node.emit('production-error', payload);
          }
          payload.output = output;
          node.send(rule.name, 'response', payload, function (err) {
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
  });

  node.on('production-error', function (payload, callback) {
    var error = payload.error;
    var rulename = payload.http.config.outlet;
    node.logger.error('Production error [' + rulename + '] %s', error);
    if (error.source) node.logger.error(error.source);
    var method = /not found/i.test(error.toString()) ? 'response-notfound' : 'response-error';
    var data = { _response: payload.http.response, message: error.toString() };
    node.send('Adapter.Http.Server', method, data, callback);
  });

  node.on('response-error', function (payload, callback) {
    var error = payload.error;
    var rulename = payload.http.config.outlet;
    node.logger.error('Response error [' + rulename + '] %s', error);
    var method = 'response-error';
    var data = { _response: payload.http.response, message: error.toString() };
    node.send('Adapter.Http.Server', method, data, callback);
  });

  return node;
};

