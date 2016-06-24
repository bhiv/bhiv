var path     = require('path');
var fs       = require('fs');
var cluster  = require('cluster');
var os       = require('os');
var async    = require('async');
var minimist = require('minimist');
var Bhiv     = require('bhiv');
var Yolo     = require('./Yolo.js');
var Module   = require('./Module.js');
var Logger   = require('node-wrapper/logger');

var logger   = Logger.create('Kernel');
var cwd      = process.cwd();
var ywd      = path.join(__dirname, '..');

global.Yolo  = Yolo;

// let it synchronous
(function YoloBootstrap() {
  var toplevel = this;
  var Root = new Yolo.Node('ServerSide', 'Root');

  this.side = 'server';
  this.ready = false;
  this.debug = typeof v8debug === 'object';
  this.createLogger = function (name) { return Logger.create(name); };
  this.dirname = ywd;
  this.paths = [ywd, cwd];
  this.Root = Root;

  /************************/

  (function loop(wd, paths) {
    try {
      var file = path.join(wd, 'config', 'elders.txt');
      var parents = fs.readFileSync(file).toString().split(/\s*\n\s*/);
      parents.map(function (elderpath) {
        if (elderpath == '') return ;
        try {
          if (fs.lstatSync(elderpath).isDirectory()) {
            if (elderpath.indexOf('/') !== 0)
              elderpath = path.join(wd, elderpath);
            if (!~paths.indexOf(elderpath)) {
              paths.splice(1, 0, elderpath);
              logger.debug('Adding elder: %s', elderpath);
              loop(elderpath, paths);
            }
          } else {
            logger.warn('disarding elder %s', elderpath);
          }
        } catch (e) {
          logger.warn('disarding elder %s', elderpath);
        }
      })
    } catch (e) {}
  })(cwd, this.paths);

  /************************/

  var hostname = os.hostname();
  var environ  = process.env.ENVIRONMENT || process.env.SERVER_TYPE || 'unknown';
  var launcher = process.stdout.isTTY ? 'console' : 'daemon';
  var tasks = [];

  var configs = []
  var chain = ['default', 'custom', environ, hostname, launcher];
  var paths = this.paths;
  chain.map(function (name) {
    paths.map(function (root) {
      configs.push(path.join(root, 'config/config-' + name + '.json'));
    });
  });

  if (launcher == 'console') Error.stackTraceLimit = Infinity;

  var configChain = [];
  for (var i = 0; i < configs.length; i++)
    if (typeof configs[i] === 'string')
      configChain.push(configs[i]);
  for (var i = 0; i < configChain.length; i++) {
    try { var content = fs.readFileSync(configChain[i]).toString(); }
    catch (e) { continue ; }
    logger.debug('loading config file:', configChain[i]);
    var data = JSON.parse(content);
    Yolo.Util.merge(this, data);
  }

  /************************/

  var logOutput = Bhiv.getIn(this, 'Logs.output');
  if (logOutput) Logger.setOutputMethod(logOutput);

  /************************/

  if (cluster.isMaster) {
    var cfg = this.Cluster || { count: 0 };
    if (!(cfg.count > 0)) cfg.count = os.cpus().length;
    if (cfg.count > 1) {
      for (var i = 0; i < cfg.count; i += 1) cluster.fork();
      return ;
    }
  }

  /************************/

  var Invoker = new Module(this.paths.slice().reverse());
  Root.require = function (fqn, callback, as) {
    var node = null;
    var layouts = [fqn];
    if (as != null && as != fqn) layouts.push(as);
    var structure = new Yolo.Structure();
    structure.data = {};
    structure.layouts = [];
    for (var i = 0; i < layouts.length; i++) {
      var layout = layouts[i];
      structure.layouts.push(layout);
      if (toplevel.Config[layout] == null) continue ;
      Yolo.Util.merge(structure.data, toplevel.Config[layout]);
    }
    node = new Yolo.Node(fqn).ingest(structure);
    return Invoker.invoke(fqn, node, function (err, node) {
      if (err) {
        debugger;
        logger.error('Module %s could not be loaded due to error:', fqn, err);
        return callback(err);
      } else {
        logger.debug('Loading module %s', fqn);
        return callback(null, node);
      }
    });
  };

  /****************************************/

  var triggers = [];
  return async.map(Object.keys(this.Services), function (name, cb) {
    var service = toplevel.Services[name];
    if (service.engine == null) service.engine = name;
    logger.info('Loading service: %s as %s', service.engine, name);
    return Root.require(service.engine, function (err, node) {
      if (err) {
        logger.error('Service %s loading failure: %s', name, err);
        return cb();
      } else {
        Root.attach(node, name);
        node.emit('init', node, function (err, payload) {
          if (err) return cb(err);
          if (service.events instanceof Array) {
            service.events.map(function (entry) {
              triggers.push(function (cb) { node.send(entry[0], entry[1], cb); });
            });
          }
          return cb();
        });
      }
    }, name);
  }, function () {
    return async.series(triggers, function (err) {
      if (err) {
        logger.critical(err);
        process.exit();
      }
      return setImmediate(handleArguments);
    });
  });

  /************************/

  function handleArguments() {
    var argv = minimist(process.argv.slice(2));
    if (argv._.length == 2) {
      toplevel.ready = true;
      var fqn = argv._[0];
      var data = JSON.parse(argv._[1]);
      return toplevel.Root.send(fqn, data, function (err, data) {
        if (err) logger.error(err);
        else console.log(JSON.stringify(data, null, 2));
        process.exit();
      });
    } else {
      toplevel.ready = true;
      return ;
    }
  };

  /************************/

}).call(module.exports);
