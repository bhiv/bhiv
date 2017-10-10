// UroxGvT3uDMQCT1va20i43ZZSxo
var babelRegister = require('babel-register');

babelRegister(new function () {
  this.only = /\/app\//;
  this.extensions = ['.es'];
  this.presets = [ require('babel-preset-es2015') ];
});

void require('pegjs-require');

var path     = require('path');
var fs       = require('fs');
var cluster  = require('cluster');
var os       = require('os');
var kexec    = require('kexec');
var async    = require('async');
var minimist = require('minimist');
var jp       = require('jmespath');
var yaml     = require('js-yaml');
var Bhiv     = require('../Bhiv.js');
var Module   = require('./Module.js');
var Logger   = require('node-wrapper/logger');

var logger   = Logger.create('Kernel');
var mwd      = path.dirname(process.mainModule.filename);
var ywd      = path.join(__dirname, '../..');

global.Bhiv  = Bhiv;

// let it synchronous
global.toplevel = (function BhivBootstrap() {
  var toplevel = this;
  var Root = new Bhiv.Node('ServerSide', 'Root');
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
  // catch asynchronous throwed errors

  process.on('uncaughtException', function (err) {
    if (err.getExtra) logger.error(err.stack, err.getExtra());
    else logger.error(err.stack);
  });


  /************************/
  // compute dependency paths
  //

  this.paths = (function loop(origin, slot, done) {
    const pkg = require(path.join(origin, 'package.json'));
    const paths = [origin];
    for (let name in pkg[slot]) {
      if (!/^bhiv-/.test(name)) continue ;
      if (name in done) continue ;
      logger.debug('Adding dependency: %s', name);
      done[name] = true;
      const module = path.join(origin, 'node_modules', name);
      Array.prototype.push.apply(paths, loop.call(this, module, slot, done));
    }
    if (this.testing)
      Array.prototype.push.apply(paths, loop.call(this, origin, 'devDependencies', done));
    return paths;
  }).call(this, mwd, 'dependencies', {}).concat(ywd);

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
  var test = (this.testing ? 'with' : 'without') + 'testing';
  var debug = (this.debug ? 'with' : 'without') + 'debug';
  var launcher = process.stdin.isTTY ? 'console' : 'daemon';
  var configs = []
  var chain = ['default', 'env-' + environ, 'host-' + hostname, test, debug, 'mode-' + launcher];
  var paths = this.paths;
  chain.map(function (name) {
    paths.map(function (root) {
      configs.push(path.join(root, 'config/' + name + '.yml'));
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
    var config = yaml.safeLoad(content);
    Bhiv.Util.merge(this.Config, config.Data);
    for (var fqn in config.Instances) {
      var instance = config.Instances[fqn];
      if (instances[fqn] == null) instances[fqn] = { engines: [] };
      if (typeof instance == 'string') instance = { engines: [instance] };
      if (instance == null) delete instances[fqn];
      else Bhiv.Util.merge(instances[fqn].engines, instance.engines);
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

  var logOutput = Bhiv.Util.getIn(this.Config, 'Logs.output');
  if (logOutput) Logger.setOutputMethod(logOutput);

  var Log = new Bhiv.Node('Log');
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

  Bhiv.Error = Bhiv.Util.wrapError;
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
  Bhiv.VM.AST.Waterfall.prototype.load = function (filepath, prefix) {
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

  Bhiv.VM.DSL.jp = function (dsl, data, callback) {
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
  Root.require = new Bhiv.Loader(Root, invoker, toplevel.Config);

  /****************************************/
  // Start services

  setTimeout(function () {
    // TODO: remove async dependency
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
      // TODO: remove async dependency
      return async.map(nodes, function (node, cb) {
        if (node == null) return cb();
        var fqn = [{ type: 'inlet', name: '-start' }];
        return node.send(fqn, node, function (err) {
          if (err) {
            if (!(err instanceof Error)) err = Bhiv.Util.wrapError(err);
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
        if (err) logger.error(Bhiv.Util.wrapError(err));
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
