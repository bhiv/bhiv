var Bhiv = require('bhiv');
var Module = require('lib/Module');

module.exports = function (node) {

  node.on('init', function (data, event) {
    Module.grow(node, function (err) {
      return event.reply(err);
    });
  });

  return node;
};

