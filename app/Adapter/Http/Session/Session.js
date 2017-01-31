var Cookie     = require('cookies');
var Bhiv       = require('bhiv');
// TODO move Session Class into another file

module.exports = function (node, logger) {

  var defaultLifetime = 3600;

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
    return node.send('Handler:write', { sid: this.sid, data: data }, callback);
  };

  Session.prototype.destroy = function (payload, callback) {
    var session = this;
    return this.node.send('Handler:remove', { sid: this.sid }, function (err) {
      if (err) logger.warn(err);
      session.data = {};
      session.diff = {};
      return callback();
    });
  };

  /***************************************/

  node.on('-start', function (slice, callback) {
    var handler = ['Handler', node.get('handler') || 'File'].join('.');
    this.node.create(handler, 'Handler', function (err, result) {
      result.leaf.set('lifetime', node.get('lifetime') || defaultLifetime);
    });
    return this.super(slice, callback);
  });

  node.on('attach', function (transaction, callback) {
    var cookies = new Cookie(transaction.request, transaction.response);
    var sid = cookies.get('YSID');
    var lifetime = this.node.get('lifetime') || defaultLifetime;
    if (sid == null) {
      var sid = Yolo.Util.id(64);
      var expires = Date.now() + (1000 * lifetime);
      cookies.set('YSID', sid, { expires: new Date(expires) });
      transaction.request.session = new Session(sid);
      return callback();
    } else {
      this.node.send('Handler:read', { sid: sid }, function (err, data) {
        if (err) return callback(err);
        var session = new Session(sid, data);
        transaction.request.session = session;
        return callback();
      });
    }
  });

};