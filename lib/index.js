var logger = { _error: console.error.bind(console) };

var babelRegister = require('babel-register');

babelRegister(new function () {

  this.only = /\/app|lib\//;

  this.extensions = ['.es6', '.es', '.jsx'];

  this.presets = [ require('babel-preset-es2015') ];

});

require('pegjs-require');

process.on('uncaughtException', function (err) {
  if (err.getExtra) logger._error(err.stack, err.getExtra());
  else logger._error(err.stack);
});

process.on('SIGINT', function() {
  console.log('SIGINT');
  process.exit();
});

global.toplevel = require('./bootstrap.js');
