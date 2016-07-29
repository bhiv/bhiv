var path   = require('path');
var async  = require('async');
var glob   = require('glob');
var Yolo   = require('./Yolo.js');
var Logger = require('node-wrapper/logger');
var logger = Logger.create('Module');

module.exports = function (dependencies) {
  return function invoke(fqn, callback) {
    var filepath = fqn.replace(/\./g, '/');
    var variants = ['.', fqn.split('.').pop()];
    var locations = [];
    var locset = {};
    var froms = ['.'];
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
    for (var i = 0; i < locations.length; i++) {
      var location = locations[i];
      try {
        var overload = require(location.path);
        break ;
      } catch (e) {
        if (e.code == 'MODULE_NOT_FOUND' && ~e.message.indexOf(location.path)) {
          if (i + 1 < locations.length) continue ;
          logger.debug(e.message);
          return callback(null, null);
        } else if (e instanceof Error) {
          logger.warn('failed to load: %s', fqn);
          return callback(e.stack);
        } else {
          return callback(e);
        }
      }
    }
    if (overload == null) return callback(null, node);
    if (typeof overload === 'function') overload = { default: overload };
    if (typeof overload.default != 'function') {
      return callback('Module ' + fqn + ' must be a constructor');
    }
    var name = fqn.split('.').pop();
    var node = new Yolo.Node(location.fqn, name);
    if (node.logger == null) node.logger = Logger.create(location.fqn);
    try { overload.default(node); }
    catch (e) { return callback(e); }
    logger.info('Invoke %s', fqn);
    if (node.layout == null) node.layout = location.fqn;
    return callback(null, node);
  };
};
