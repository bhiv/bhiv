var Cookie     = require('cookies');
var Bhiv       = require('bhiv');
// TODO move Session Class into another file

module.exports = function (node) {

  var Session = function (sid, data) {
    this.sid  = sid;
    this.data = data || {};
    this.diff = {};
  };

  Session.prototype.get = function (key) {
    return Bhiv.getIn(this.data, key);
  };

  Session.prototype.set = function (key, value) {
    this.put(key, value);
    if (this.delayed) this.deleyed = clearTimeout(this.delayed);
    this.delayed = setTimeout(function (session) {
      session.save();
    }, 10, this);
  };

  Session.prototype.put = function (key, value) {
    Bhiv.setIn(this.data, key, value);
    Bhiv.setIn(this.diff, key, value);
  };

  Session.prototype.has = function (key) {
    return Bhiv.getIn(this.data, key) != null;
  };

  Session.prototype.save = function (callback) {
    if (!callback) callback = function () {};
    if (this.delayed) this.deleyed = clearTimeout(this.delayed);
    var data  = this.data;
    // TODO fetch, merge and replace with this.diff object
    this.diff = {};
    var args = ['/session/' + this.sid, node.get('lifetime'), JSON.stringify(data)];
    return node.send('Redis:execute', { cmd: 'setex', args: args }, callback);
  };

  Session.prototype.destroy = function () {
    node.send('Redis:execute', { cmd: 'del', args: ['/session/' + this.sid] });
    this.data = {};
    this.diff = {};
  };

  node.on('set', function (config, event) {
    switch (config.handler) {
    case 'redis': return node.emit('set-redis', config, event);
    default: return event.reply('fail', 'Handle ' + config.handler + ' not implemented');
    }
  });

  node.on('set-redis', function (config, event) {
    node.create('Modules', 'Adapter.Redis', 'Redis', function (err, redis) {
      if (err) return event.reply('fail', err);
      redis.emit('connect', config, event);
    });
  });

  node.on('attach', function (transaction, event) {
    var cookies = new Cookie(transaction.request, transaction.response);
    var sid = cookies.get('YSID');
    var lifetime = node.get('lifetime') || 600;
    if (sid == null) {
      var sid = Yolo.Util.id(64);
      var expires = Date.now() + (1000 * lifetime);
      cookies.set('YSID', sid, { expires: new Date(expires) });
      transaction.request.session = new Session(sid);
      return event.reply();
    } else {
      var cmd = { cmd: 'get', args: ['/session/' + sid] };
      return node.send('Redis:execute', cmd, function (err, result) {
        if (err) node.logger.error(Yolo.Util.wrapError(err));
        try {
          var data = JSON.parse(result);
        } catch (e) {
          node.logger.warn('Session from ' + sid + ' not parseable');
          node.logger.error(Yolo.Util.wrapError(e, result));
          var data = null;
        }
        var session = new Session(sid, data);
        transaction.request.session = session;
        return event.reply();
      });
    }
  });

  return node;
};