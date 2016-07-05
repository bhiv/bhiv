var path   = require('path');
var async  = require('async');
var glob   = require('glob');
var Yolo   = require('./Yolo.js');
var Logger = require('node-wrapper/logger');
var logger = Logger.create('Module');

module.exports = function (dependencies) {
  var Module = this;

  this.invoke = function (options, callback) {
    if (typeof options == 'string') options = { fqn: options };
    var fqn = options.fqn;
    var node = options.node;
    var filepath = fqn.replace(/\./g, '/');
    var variants = ['.', fqn.split('.').pop()];
    var locations = [];
    var locset = {};
    var froms = ['.'];
    if (options.real != null) froms.push(options.real.replace(/\./g, '/'));
    if (options.virtual != null) froms.push(options.virtual.replace(/\./g, '/'));
    froms.reverse();
    var extensions = ['.js', '.es'];
    froms.map(function (from) {
      dependencies.map(function (root) {
        variants.map(function (variant) {
          extensions.map(function (ext) {
            var built = path.join(root, 'app', from, filepath, variant) + ext;
            var fqn = path.join(from, filepath).replace(/\//g, '.');
            if (locset[built] != null) return ;
            locset[built] = true;
            locations.push({ path: built, fqn: fqn });
          });
        });
      });
    });
    //locations.map(e => console.log(e.path));
    for (var i = 0; i < locations.length; i++) {
      var location = locations[i];
      try {
        var overload = require(location.path);
        break ;
      } catch (e) {
        if (e.code == 'MODULE_NOT_FOUND' && ~e.message.indexOf(location.path)) {
          if (i + 1 < locations.length) continue ;
          logger.debug(e.message);
          return callback(e);
        } else if (e instanceof Error) {
          logger.warn('failed to load: %s', fqn);
          return callback(e.stack);
        } else {
          return callback(e);
        }
      }
    }
    if (typeof overload === 'function') overload = { default: overload };
    if (overload == null || typeof overload.default != 'function')
      return callback('Module ' + fqn + ' must be a constructor');
    if (node == null) node = new Yolo.Node(location.fqn);
    if (node.logger == null) node.logger = Logger.create(location.fqn);
    try { overload.default(node); }
    catch (e) { return callback(e); }
    logger.info('Invoke %s', fqn);
    if (node.name == null) node.name = fqn.split('.').pop();
    if (node.layout == null) node.layout = location.fqn;
    return callback(null, node);
  };

};
