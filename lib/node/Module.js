// UroxGvT3uDMQCT1va20i43ZZSxo
var path   = require('path');
var async  = require('async');
var fs     = require('fs');
var glob   = require('glob');
var Bhiv   = require('../Bhiv.js');
var Logger = require('node-wrapper/logger');
var logger = Logger.create('Module');

module.exports = function (dependencies, environments) {

  var magicNumber = 'UroxGvT3uDMQCT1va20i43ZZSxo';
  var cache = new Bhiv.Cache(3);

  return function invoke(opts, callback) {
    if (typeof opts == 'string') opts = { fqn: opts, args: [] };
    var key = Bhiv.Digest(opts);
    var waiter = cache.waitFor(key, callback);
    if (waiter == null) return ;
    var locations = generateLocations(opts.fqn);
    return getExistingFiles(locations, function (err, locations) {
      if (err) return waiter(err);
      if (locations.length == 0) {
        return createNutshell(opts, waiter);
      } else {
        return proceedRequires(opts, locations, waiter);
      }
    });
  };

  function checkMagic(filepath, callback) {
    Bhiv.Util.defer(function () {
      return fs.open(filepath, 'r', function (e, fd) {
        if (e) return callback ? callback(e) : void e;
        var buf = new Buffer(1024);
        return fs.read(fd, buf, 0, 1024, 0, function (e) {
          fs.close(fd);
          if (e) return callback ? callback(e) : void e;
          if (~buf.indexOf(magicNumber)) return callback ? callback(null, true) : void true;
          if (callback) return callback(null, false);
          logger.warn('%s does not have magic number', filepath);
          logger.warn('  Please insert /*!%s*/ at the begining', magicNumber);
          logger.warn('  or execute: yolo-cli set-magic %s', filepath);
        });
      });
    });
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
          environments.map(function (env) {
            var built = path.join(env, from, filepath, variant) + ext;
            var fqn = path.join(from, filepath).replace(/\//g, '.');
            if (locset[built] != null) return ;
            locset[built] = true;
            locations.push(built);
          });
        });
      });
    });
    return locations;
  };

  function getExistingFiles(locations, callback) {
    var paths = [];
    var mydeps = dependencies.slice().reverse();
    for (var i = 0; i < mydeps.length; i++)
      for (var ii = 0; ii < locations.length; ii++)
        paths.push(path.join(mydeps[i], locations[ii]));
    var result = []
    return async.map(paths, function (location, callback) {
      return fs.stat(location, function (err) {
        if (err) return callback(null, null);
        result.push(location);
        return callback(null, null);
      });
    }, function () {
      return callback(null, result);
    });
  };

  function defaultNodeLayout(node, logger) {
    ['debug', 'notice', 'log', 'warn', 'error', 'trace'].map(function (verbe) {
      node.on(verbe, function (message) { logger[verbe](message); return message });
    });
  };

  function createNutshell(opts, callback) {
    logger.debug('Nutshell created:', opts.fqn);
    var grower = createGrower(opts.fqn, opts.args);
    grower.calls.push({ default: defaultNodeLayout });
    return callback(null, grower);
  };

  function proceedRequires(opts, locations, callback) {
    var grower = createGrower(opts.fqn, opts.args);
    for (var i = 0; i < locations.length; i++) {
      var location = locations[i];
      try { var module = require(location); }
      catch (e) { return callback(e); }
      if (process.env.NODE_ENV == 'development') checkMagic(location);
      if (typeof module === 'function') module = { default: module };
      if (module == null) {
        logger.notice('Module %s found (%s) but no grower declared', opts.fqn, location);
        continue ;
      } else if (typeof module.default != 'function') {
        logger.notice('Module %s found (%s) but grower is not a function', opts.fqn, location);
        continue ;
      }
      logger.debug('Invoking: %s from %s', opts.fqn, location);
      grower.calls.unshift(module);
    }
    return callback(null, grower);
  };

  function createGrower(fqn, args) {
    var grower = function grower() {
      var fqn = grower.fqn;
      var node = null;
      var logger = Logger.create(fqn);
      for (var i = 0; i < grower.calls.length; i++) {
        var layout = new Bhiv.Node(fqn, fqn.split('.').pop());
        grower.calls[i].default.call(grower, layout, logger);
        if (node != null) layout.setOlder(node);
        node = layout;
      }
      return node;
    };
    grower.fqn = fqn;
    grower.args = args;
    grower.calls = [];
    return grower;
  };

};
