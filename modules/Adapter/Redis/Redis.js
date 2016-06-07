var redis = require("redis");

module.exports = function (node) {

  var client = null;

  node.on('connect', function (config, event) {
    if (client) client.end(true);
    client = redis.createClient(config);
    if (config.db) client.select(config.db);
    node.logger.info('Connecting to %s:%s', config.host || 'localhost', config.port);
    return event.reply();
  });

  node.on('execute', function (action, event) {
    if (client == null) return event.reply('fail', 'Redis client not connected');
    return client[action.cmd].apply(client, action.args.concat(function (err, result) {
      if (err) return event.reply('fail', err);
      else return event.reply('done', result);
    }));
  });

  return node;
};