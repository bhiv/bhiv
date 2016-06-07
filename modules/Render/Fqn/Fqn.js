module.exports = function (node) {

  node.on('produce', function (data, event) {
    return node.send(data.render.path, data, event);
  });

  return node;
};
