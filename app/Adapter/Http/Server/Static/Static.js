var Bhiv   = require('bhiv');

module.exports = function (node) {
  var Bee  = new Bhiv(node.createInvoke(), node.data).Bee;

  node.on('serve', new Bee()
          .pipe({ type: 'file', filepath: 'static/${params.filepath}${params.0}' })
          .end()
         );

  return node;
};