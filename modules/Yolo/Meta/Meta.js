var path  = require('path');
var glob  = require('glob');

module.exports = function (node) {

  var parsers = { '.json': 'Language.Json:parse'
                , '.nut': 'Yolo.Nut:parse'
                , '.bolt': 'Yolo.Bolt:parse'
                , fail: 'Yolo.Error:failwith'
                };

  node.on('get', function (key, event) {
    var filepattern = path.join('metas', key) + '.{json,nut,bolt}';
    return glob(filepattern, node.get('Glob'), function (err, files) {
      if (err) return event.reply('fail', err);
      if (files.length < 1) return event.reply('fail', 'key: "' + key + '" not found');
      var file = files[0];
      if (files.length > 1) node.logger.warn('Multi choice for ' + key + ' using ' + file);
      return node.send('Yolo.Util.Retriever:url', file, function (err, content) {
        if (err) return event.reply('fail', err);
        return node.send(parsers[path.extname(file)] || parsers.fail, content, function (err, content) {
          if (err) return event.reply('fail', err);
          Object.defineProperty(content, 'key', { value: key });
          return event.reply('done', content);
        });
      });
    });
  });

  return node;

};