var fs     = require("fs");
var mysql  = require('node-wrapper/mysql');

module.exports = function (node, logger, Bee) {

  node.on('init', function (_, callback) {
    const name = this.node.layout;
    const config = this.node.get('.');
    this.node.set('client', mysql.createConnection(name, config));
    return callback();
  });

  node.on('query', new Bee()
          .then(':retrieveQuery', null, { query: '${.}' })
          .then(':prepareQuery', '${query}', { query : '${.}' })
          .pipe(':executeQuery')
          .end()
         );

  node.on('retrieveQuery', function (flow, callback) {
    if (flow.filename) return this.node.send(':getFile', flow.filename, callback);
    else if (flow.query != undefined) return callback(null, flow.query);
    else return callback("No query");
  });

  node.on('getFile', new Bee()
    .then('Yolo.Util.Retriever:url', '${.}', { raw: '${.}' })
    .then(function (raw) { return raw.replace(/\n/g, ' '); }, '${raw}')
    .end()
  );

  node.on('prepareQuery', function (query, callback) {
    var scope = { db: this.node.get('dbs') };
    var prepared = query.replace(/\$\{([^\}]+)\}/g, function (_, key) {
      return Yolo.Util.getIn(scope, key);
    });
    return callback(null, prepared);
  });

  node.on('executeQuery', function (flow, callback) {
    return this.node.get('client').query(flow.query, flow.params, callback);
  });

};
