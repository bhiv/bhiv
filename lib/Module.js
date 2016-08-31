var path   = require('path');
var async  = require('async');
var fs     = require('fs');
var glob   = require('glob');
var Yolo   = require('./Yolo.js');
var Logger = require('node-wrapper/logger');
var logger = Logger.create('Module');
var Bhiv   = require('bhiv');

module.exports = function (dependencies) {

  var cache = new Yolo.Cache();

  Bhiv.Error = Yolo.Util.wrapError;

  return function invoke(fqn, callback) {
    var locations = generateLocations(fqn);
    return getExistingFiles(locations, function (err, locations) {
      if (err) return callback(err);
      if (locations.length == 0) {
        return createNutshell(fqn, callback);
      } else {
        return proceedRequires(fqn, locations, callback);
      }
    });
  };

  function createNutshell(fqn, callback) {
    var grower = createGrower(fqn);
    grower.calls.push({ default: function () {} });
    return callback(null, grower);
  };

  function generateLocations(fqn) {
    var filepath = fqn.replace(/\./g, '/');
    var variants = ['.', fqn.split('.').pop()];
    var locations = [];
    var locset = {};
    var froms = ['.'];
    froms.reverse();
    var extensions = ['.es', '.js'];
    froms.map(function (from) {
      variants.map(function (variant) {
        extensions.map(function (ext) {
          var built = path.join('app', from, filepath, variant) + ext;
          var fqn = path.join(from, filepath).replace(/\//g, '.');
          if (locset[built] != null) return ;
          locset[built] = true;
          locations.push(built);
        });
      });
    });
    return locations;
  };

  function getExistingFiles(locations, callback) {
    return async.concat(dependencies, function (root, cb_1) {
      return async.reduce(locations, null, function (_, pathname, cb_2) {
        var location = path.join(root, pathname);
        return fs.stat(location, function (err) {
          if (err) return cb_2(null, null);
          return cb_1(null, [location]);
        });
      }, function () {
        return cb_1(null, []);
      });
    }, callback);
  };

  function proceedRequires(fqn, locations, callback) {
    var grower = createGrower(fqn);
    for (var i = 0; i < locations.length; i++) {
      var location = locations[i];
      try { var module = require(location); }
      catch (e) { return callback(e); }
      if (typeof module === 'function') module = { default: module };
      if (module == null) {
        logger.notice('Module %s found (%s) but no grower declared', fqn, location);
        continue ;
      } else if (typeof module.default != 'function') {
        logger.notice('Module %s found (%s) but grower is not a function', fqn, location);
        continue ;
      }
      logger.debug('Invoking: %s from %s', fqn, location);
      grower.calls.unshift(module);
    }
    return callback(null, grower);
  };

  function createGrower(fqn) {
    var grower = function grower() {
      var fqn = grower.fqn;
      var node = null;
      for (var i = 0; i < grower.calls.length; i++) {
        var layout = new Yolo.Node(fqn, fqn.split('.').pop());
        var logger = Logger.create(fqn);
        var Bee = new Bhiv(layout.createInvoke(), layout.data).Bee;
        grower.calls[i].default.call(grower, layout, logger, Bee);
        if (node != null) layout.setOlder(node);
        node = layout;
      }
      return node;
    };
    grower.fqn = fqn;
    grower.calls = [];
    return grower;
  };

};
