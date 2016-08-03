module.exports = function (node, logger, Bee) {

  node.on('serve', new Bee()
          .pipe({ type: 'file', filepath: 'static/${params.filepath}${params.0}' })
          .end()
         );

  return node;
};