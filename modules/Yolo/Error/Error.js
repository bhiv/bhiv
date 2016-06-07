module.exports = function (node) {

  node.on('failwith', function (message, event) {
    return event.reply('fail', Yolo.Error.wrapError(message));
  });

  return node;
};