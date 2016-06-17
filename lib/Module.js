var path   = require('path');
var async  = require('async');
var glob   = require('glob');
var Yolo   = require('./Yolo.js');
var Logger = require('node-wrapper/logger');
var logger = Logger.create('Module');

module.exports = function (paths) {
  var Module = this;

  this.invoke = function (fqn, node, callback) {
    if (arguments.length == 2) { callback = node; node = null; }
    var pathfile = fqn.replace(/\./g, '/');
    var type = fqn.split('.').pop();
    var locations = [];
    paths.map(function (root) {
      locations.push(path.join(root, 'app', pathfile, type + '.js'));
    });
    for (var i = 0; i < locations.length; i++) {
      var location = locations[i];
      try {
        var overload = require(location);
        break ;
      } catch (e) {
        if (e.code == 'MODULE_NOT_FOUND' && ~e.message.indexOf(location)) {
          if (i + 1 < locations.length) continue ;
          logger.debug(e.message);
          return callback('Module ' + fqn + ' not found');
        } else if (e instanceof Error) {
          logger.warn('failed to load: %s', location);
          return callback(e.stack);
        } else {
          return callback(e);
        }
      }
    }
    if (typeof overload === 'function') {
      if (node == null) node = new Yolo.Node(fqn);
      node.logger = Logger.create(fqn);
      void overload(node);
      logger.info('Invoke %s', fqn);
      return node.emit('load', node, function (err) { return callback(err, node); });
    } else {
      return callback('Module ' + fqn + ' must be a constructor');
    }
  };

  this.grow = function (node, callback) {
    var trimroot = false;
    var basefqn = node.cwp();
    basefqn.shift(); // put off Modules base node
    var basedir = path.join(moduleDir, basefqn.join('/'));
    return glob('*/*.js', { cwd: basedir }, function (err, files) {
      if (err) return logger._error(err);
      return async.map(files, function (file, callback) {
        var fqn = basefqn.slice().concat(file.split(/\//));
        var name = fqn.pop();
        name = name.substr(0, name.length - 3);
        if (name != fqn[fqn.length - 1]) return callback();
        return Module.invoke(fqn.join('.'), function (err, child) {
          if (err) return callback(err);
          node.attach(child, name);
          return callback(null, child);
        });
      }, function (err, children) {
        return callback(err, children);
      });
    });
  };

};
