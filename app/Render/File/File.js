var path = require('path');

module.exports = function (node) {

  node.on('produce', function (data, event) {
    var filepath = path.join('renders', data.render.path);
    node.send('Yolo.Util.Retriever', 'url', filepath, function (err, renderString) {
      if (err) return event.reply('fail', err);
      try { var render = JSON.parse(renderString); }
      catch (e) { return event.reply('fail', e); }
      return node.send(render.controller, data, event);
    });
  });

  return node;
};
