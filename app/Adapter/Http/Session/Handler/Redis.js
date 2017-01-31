module.exports = function (node, logger) {

  node.on('-load', function (slice, callback) {
    node.create('Adapter.Redis', 'Redis');
    return this.super(slice, callback);
  });

  node.on('read', function (payload, event) {
    var sid = payload.sid;
    var cmd = { cmd: 'get', args: ['/session/' + sid] };
    return node.send('Redis:execute', cmd, function (err, result) {
      if (err) logger.error(Yolo.Util.wrapError(err));
      try {
        var data = JSON.parse(result);
      } catch (e) {
        logger.warn('Session from ' + sid + ' not parseable');
        logger.error(Yolo.Util.wrapError(e, result));
        var data = null;
      }
      return event.reply(null, data);
    });
  });

  node.on('write', function (payload, event) {
    var data = payload.data;
    var sid = payload.sid;
    var args = ['/session/' + sid, node.get('lifetime'), JSON.stringify(data)];
    return node.send('Redis:execute', { cmd: 'setex', args: args }, event.createCallback());
  });

  node.on('remove', function (payload, event) {
    var args = ['/session/' + payload.sid];
    return node.send('Redis:execute', { cmd: 'del', args: args }, event.createCallback());
  });

};
