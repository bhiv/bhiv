// UroxGvT3uDMQCT1va20i43ZZSxo
var path     = require('path');
var fs       = require('fs');
var cluster  = require('cluster');
var os       = require('os');
var kexec    = require('kexec');
var async    = require('async');
var minimist = require('minimist');
var amp      = require('app-module-path');
var jp       = require('jmespath');
var Bhiv     = require('bhiv');
var Yolo     = require('./Yolo.js');
var Module   = require('./Module.js');
var Logger   = require('node-wrapper/logger');

var logger   = Logger.create('Kernel');
var mwd      = path.dirname(process.mainModule.filename);
var ywd      = path.join(__dirname, '..');

global.Yolo  = Yolo;

// let it synchronous
(function YoloBootstrap() {
  var toplevel = this;
  var Root = new Yolo.Node('ServerSide', 'Root');
  var instances = {};
  var argv = minimist(process.argv.slice(2));

  this.side = 'server';
  this.ready = false;
  this.debug = (function () {
    if (typeof v8debug === 'object') return true;
    for (var i = 0; i < process.execArgv.length; i++)
      if (process.execArgv[i].indexOf('--debug') === 0)
        return true;
    return false;
  })();
  this.testing = !!~process.argv.indexOf('--test');
  this.createLogger = function (name) { return Logger.create(name); };
  this.dirname = ywd;
  this.paths = [ywd, mwd];
  this.Root = Root;
  this.Config = {};

  argv.debug = this.debug;

  /************************/
  // rename process

  (function (name, argv) {
    return ;
    if (argv.debug) return logger.notice('Process renaming aborted due to debugging mode');
    if (argv.execute) return logger.debug('Process running command line');
    var title = 'node yolojs ' + name;
    process.title = title;
    for (var i = 1; i < process.argv.length; i++)
      if (process.argv[i].charAt(0) == '#')
        return ;
    var padding = new Array(title.length).join('#');
    logger.log('Restart to name process: %s', title);
    return kexec(process.argv[0], process.argv.slice(1).concat(padding));
  })(path.basename(mwd), argv);

  /************************/
  // compute dependency paths

  (function loop(wd, paths) {
    try {
      var file = path.join(wd, 'config', 'elders.txt');
      var parents = fs.readFileSync(file).toString().split(/\s*\n\s*/);
      parents.map(function (elderpath) {
        if (elderpath == '') return ;
        try {
          if (fs.statSync(elderpath).isDirectory()) {
            if (elderpath.indexOf('/') !== 0)
              elderpath = path.join(wd, elderpath);
            if (!~paths.indexOf(elderpath)) {
              logger.debug('Adding dependency: %s', elderpath);
              paths.splice(1, 0, elderpath);
              loop(elderpath, paths);
            }
          } else {
            logger.warn('discarding dependency %s directory not found', elderpath);
          }
        } catch (e) {
          logger.warn(e);
          logger.warn('discarding dependency %s %s', elderpath, e);
        }
      })
    } catch (e) {}
  })(mwd, this.paths);

  this.paths.map(function (dirpath) {
    amp.addPath(path.join(dirpath, 'node_modules'));
  });

  /************************/
  // compute config files

  var environments_aliases = { 'dev': 'development', 'prod': 'production' };
  var hostname = os.hostname();
  var environ  = process.env.NODE_ENV || process.env.ENVIRONMENT || 'unknown';
  environ = environ.toLowerCase();
  if (environ in environments_aliases) environ = environments_aliases[environ];
  if (environ == 'unknown')
    logger.warn('Unknown environment type (e.g. developement, staging, production)');
  process.env.NODE_ENV = environ;
  var launcher = process.stdin.isTTY ? 'console' : 'daemon';
  var configs = []
  var chain = ['default', environ, 'host-' + hostname, null, null, launcher];
  if (this.testing) chain[3] = 'testing';
  if (this.debug) chain[4] = 'debug';
  var paths = this.paths;
  chain.map(function (name) {
    if (name == null) return ;
    paths.map(function (root) {
      configs.push(path.join(root, 'config/config-' + name + '.json'));
    });
  });

  if (launcher == 'console') Error.stackTraceLimit = Infinity;

  this.Config['OS'] = { hostname: hostname };
  this.Config['Process.Config'] = { chain: chain };
  this.Config['Process.Environment'] = process.env;

  var configChain = [];
  for (var i = 0; i < configs.length; i++)
    if (typeof configs[i] === 'string')
      configChain.push(configs[i]);
  for (var i = 0; i < configChain.length; i++) {
    try { var content = fs.readFileSync(configChain[i]).toString(); }
    catch (e) { continue ; }
    logger.debug('loading config file:', configChain[i]);
    var config = JSON.parse(content);
    Yolo.Util.merge(this.Config, config.Data);
    for (var fqn in config.Instances) {
      var instance = config.Instances[fqn];
      if (instances[fqn] == null) instances[fqn] = { engines: [] };
      if (typeof instance == 'string') instance = { engines: [instance] };
      if (instance == null) delete instances[fqn];
      else Yolo.Util.merge(instances[fqn].engines, instance.engines);
    }
  }

  /***************************/
  // has test flag active

  if (toplevel.testing) {
    for (var fqn in instances) {
      instances[fqn].engines.push({ fqn: 'Test.' + fqn });
    }
  }

  /************************/
  // bind logger methods

  var logOutput = Bhiv.getIn(this.Config, 'Logs.output');
  if (logOutput) Logger.setOutputMethod(logOutput);

  var Log = new Yolo.Node('Log');
  Root.attach(Log, 'Log');
  [ 'debug', 'info', 'log'
  , 'notice', 'warn', 'trace', 'alert'
  , 'error', 'critical', 'emergency'
  ].map(function (level) {
    Log.on(level, function (message) {
      if (message instanceof Array) {
        logger[level].apply(logger, message);
      } else if (message instanceof Error) {
        logger[level].call(logger, message.stack);
      } else {
        logger[level].call(logger, message);
      }
      return message;
    });
  });

  /************************/
  // Patch libraries

  Bhiv.Error = Yolo.Util.wrapError;
  Bhiv.process = function (pattern, sources) {
    if (typeof pattern !== 'string') return pattern;
    switch (pattern.substr(0, pattern.indexOf(':'))) {
    case 'jp':
      try { return jp.search(sources[0], pattern.substr(3)); }
      catch (e) { return null; }
    default:
      return pattern;
    }
  };

  // TODO: add cache (filepath => module) to avoid calling several times require function
  Yolo.VM.AST.Waterfall.prototype.load = function (filepath, prefix) {
    if (prefix == null) prefix = '';
    for (var i = 0; i < toplevel.paths.length; i++) {
      var root = toplevel.paths[i];
      var modulePath = [root, filepath].join('/');
      try { var module = require(modulePath).default; }
      catch (e) { continue ; }
      this.$syntaxes.push({ filepath: modulePath, prefix: prefix, module: module });
      return new this.constructor(this, function () {
        this.$parent.$ast = this.$ast;
        return this.$parent.end();
      });
    }
    throw new Error('Unable to find syntax file: ' + filepath);
  };

  Yolo.VM.DSL.jp = function (dsl, data, callback) {
    try { data = jp.search(data, dsl.substr(3)); }
    catch (e) {
      logger.notice(dsl.substr(3));
      logger.notice(e);
      return callback(null, null);
    }
    return callback(null, data);
  };

  /************************/
  // Fork process

  if (cluster.isMaster && argv.execute == null) {
    var cfg = this.Config.Cluster || { count: 0 };
    if (!(cfg.count > 0)) cfg.count = os.cpus().length;
    if (cfg.count > 1) {
      for (var i = 0; i < cfg.count; i += 1) cluster.fork();
      return ;
    }
  }

  /************************/
  // Prepare Root node

  var invoker = Module(this.paths.slice().reverse());
  Root.require = new Yolo.Loader(Root, invoker, toplevel.Config);

  /****************************************/
  // Start services

  setTimeout(function () {
    return async.mapSeries(Object.keys(instances), function (name, cb) {
      var service = instances[name];
      var printableEngines = service.engines.map(function (e) {
        return typeof e == 'string' ? e : typeof e.fqn == 'string' ? e.fqn : e;
      }).join(', ');
      logger.info('Loading service: %s as %s', printableEngines, name);
      return Root.create(service.engines, name, function (err, result) {
        if (err) {
            logger.error('Service %s loading failure: %s', name, err);
            return cb();
          } else {
            return cb(null, result.leaf);
          }
      }, name);
    }, function (err, nodes) {
      return async.map(nodes, function (node, cb) {
        if (node == null) return cb();
        var fqn = [{ type: 'inlet', name: '-start' }];
        return node.send(fqn, node, function (err) {
          if (err) {
            if (!(err instanceof Error)) err = Yolo.Util.wrapError(err);
            logger.warn(err);
          }
          cb();
        });
      }, function () {
        return setImmediate(handleArguments);
      });
    });
  }, 1);

  /************************/

  function handleArguments() {
    if (argv.execute) {
      toplevel.ready = true;
      var fqn = argv.execute;
      var data = JSON.parse(argv._[0]);
      return toplevel.Root.send(fqn, data, function (err, data) {
        if (err) logger.error(Yolo.Util.wrapError(err));
        else console.log(JSON.stringify(data, null, 2));
        process.exit();
      });
    } else {
      defineAsReady();
    }
  };

  function defineAsReady() {
    toplevel.ready = true;
  };

  /************************/

  return toplevel;

}).call(module.exports);
