var Bhiv   = require('bhiv');

module.exports = function (node) {
  var Bee  = new Bhiv(node.createInvoke(), node.data).Bee;

  node.on('serve', new Bee()
          .pipe({ type: 'file', filepath: 'statics/${params.filepath}${params.0}' })
          .end()
         );

  node.on('serve-less', new Bee()
          .then('Yolo.Util.Retriever:url', 'statics/${params.filepath}.less', { content: '${.}' })
          .pipe('Language.Less:parse', '${content}', { type: 'css', content: '${template}' })
          .end()
         );

  node.on('probes', new Bee()
          .pipe({ type: 'file', filepath: 'statics/probes.html' })
          .end()
         );

  return node;
};