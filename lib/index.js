require("babel-register");

var logger = { _error: console.error.bind(console) };

process.on('uncaughtException', function (err) {
  if (err.getExtra) logger._error(err.stack, err.getExtra());
  else logger._error(err.stack);
});

global.toplevel = require('./bootstrap.js');
