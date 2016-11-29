module.exports = function (node, logger, Bee) {

  node.on('serve', new Bee()
          .pipe({ type: 'file', filepath: 'jp:[`static/`,params.filepath,params."0"]|join(``,@)' })
          .end()
         );

  return node;
};