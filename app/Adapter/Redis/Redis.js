var redis = require("redis");

module.exports = function (node, logger) {

  var client = null;

  node.on('connect', function (config, event) {
    if (client) client.end(true);

    if (config.host == null) config.host = node.get('host');
    if (config.port == null) config.port = node.get('port');
    if (config.db == null) config.db = node.get('db');

    client = redis.createClient(config);
    if (config.db) client.select(config.db);

    logger.info('Connecting to %s:%s', config.host || 'localhost', config.port);
    return event.reply();
  });

  node.on('execute', function (action, event) {
    if (client == null) {
      return node.emit('connect', {}, function (err) {
        if (err) return event.reply(err);
        return node.emit('execute', action, event);
      });
    }
    return client[action.cmd].apply(client, action.args.concat(function (err, result) {
      if (err) return event.reply('fail', err);
      else return event.reply('done', result);
    }));
  });

  return node;
};