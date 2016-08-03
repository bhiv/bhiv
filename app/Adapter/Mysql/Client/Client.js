var fs     = require("fs");
var mysql  = require('node-wrapper/mysql');

module.exports = function (node, logger, Bee) {

  node.set('client', mysql.createConnection(node.layout, node.get('.')));

  node.on('query', new Bee()

    .then(function (flow, callback) {
      if (flow.filename) return node.send(':getFile', flow.filename, callback);
      else if (flow.query != undefined) return callback(null, flow.query);
      else return callback("No query");
    }, null, {query: '${.}'})

    .then(function (query) {
      var scope = { db: node.get('dbs') };
      return query.replace(/\$\{([^\}]+)\}/g, function (_, key) {
        return Yolo.Util.getIn(scope, key);
      });
    }, '${query}', { query : '${.}' })

    .then(function (flow, callback) {
      return node.get('client').query(flow.query, flow.params, function (err, data) {
        if (err) return callback(Yolo.Util.wrapError(err));
        return callback(null, data);
      });
    })

    .end()
  );

  node.on('getFile', new Bee()
    .then('Yolo.Util.Retriever:url', '${.}', { raw: '${.}' })
    .then(function (raw) { return raw.replace(/\n/g, ' '); }, '${raw}')
    .end()
  );

};
