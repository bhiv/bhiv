import fs from 'fs';
import mysql from 'node-wrapper/mysql';

export default function (node, logger, Bee) {

  node.on('-start', function (slice, callback) {
    const name = this.node.layout;
    const config = this.node.get('.');
    this.node.set('client', mysql.createConnection(name, config));
    return this.super(slice, callback);
  });

  node.on('query', new Bee()
          .then(':retrieveQuery', null, { query: 'jp:@' })
          .then(':prepareQuery', 'jp:query', { query : 'jp:@' })
          .pipe(':executeQuery')
          .end()
         );

  node.on('retrieveQuery', function (flow, callback) {
    if (flow.filename) return this.node.send(':getFile', flow.filename, callback);
    else if (flow.query != null) return callback(null, flow.query);
    else return callback("No query");
  });

  node.on('getFile', new Bee()
          .then('Util.Retriever:url', 'jp:@', { raw: 'jp:@' })
          .then(function (raw) { return raw.replace(/\n/g, ' '); }, 'jp:raw')
          .end()
  );

  node.on('prepareQuery', function (query, callback) {
    var scope = { db: this.node.get('dbs') };
    var prepared = query.replace(/\$\{([^\}]+)\}/g, (_, key) => {
      return Yolo.Util.getIn(scope, key);
    });
    return callback(null, prepared);
  });

  node.on('executeQuery', function (flow, callback) {
    return this.node.get('client').query(flow.query, flow.params, callback);
  });

};
