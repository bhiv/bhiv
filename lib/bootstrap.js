var path     = require('path');
var fs       = require('fs');
var kexec    = require('kexec');
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
  this.debug = (function () {
    if (typeof v8debug === 'object') return true;
    for (var i = 0; i < process.execArgv.length; i++)
      if (process.execArgv[i].indexOf('--debug') === 0)
        return true;
    return false;
  })();
  this.createLogger = function (name) { return Logger.create(name); };
  this.dirname = ywd;
  this.paths = [ywd, cwd];
  this.Root = Root;

  /************************/
  // compute dependency paths

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
  // rename process

  (function (paths, debug) {
    if (debug) return logger.notice('Process renaming aborted due to debugging mode');
    var title = 'node ' + paths.reverse().map(function (path) {
      return path.split('/').pop();
    }).join(' ');
    for (var i = 1; i < process.argv.length; i++)
      if (process.argv[i].charAt(0) == '#')
        return process.title = title;
    var padding = new Array(title.length).join('#');
    logger.log('Restart to name process: %s', title);
    return kexec(process.argv[0], process.argv.slice(1).concat(padding));
  })(this.paths.slice(), this.debug);

  /************************/
  // compute config files

  var hostname = os.hostname();
  var environ  = process.env.ENVIRONMENT || process.env.SERVER_TYPE || 'unknown';
  var launcher = process.stdout.isTTY ? 'console' : 'daemon';
  var tasks = [];

  var configs = []
  var chain = ['default', 'custom', environ, hostname, launcher];
  if (this.debug) chain.splice(4, 0, 'debug');
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

  var invoker = Module(this.paths.slice().reverse());
  Root.require = new Yolo.Loader(Root, invoker, toplevel.Config);

  /****************************************/

  setTimeout(function () {
    async.map(Object.keys(this.Instances), function (name, cb) {
      var service = toplevel.Instances[name];
      if (typeof service == 'string') service = { engine: service };
      if (service.engine == null) service.engine = name;
      logger.info('Loading service: %s as %s', service.engine, name);
      return Root.create(service.engine, name, function (err, result) {
        if (err) {
          logger.error('Service %s loading failure: %s', name, err);
          return cb();
        } else {
          var node = result.leaf;
          return node.emit('init', node, cb);
        }
      }, name);
    }, function () {
      // TODO: execute triggers
      return setImmediate(handleArguments);
    });
  }.bind(this), 1);

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
      defineAsReady();
    }
  };

  function defineAsReady() {
    toplevel.ready = true;
  };

  /************************/

  return toplevel;

}).call(module.exports);
