import async from 'async';

export default function (node, logger) {

  node.kind('Record');

  node.on('-load', function (_, callback) {
    return async.map(this.node.field(), (name, cb) => {
      const field = this.node.field(name);
      return this.node.send('Type:get', field.fqn, (err, node) => {
        if (err) return cb(err);
        field.node = node;
        return cb(null, node);
      });
    }, err => {
      return callback(err);
    });
  });

  node.on('parse', function (record, callback) {
    const result = {};
    return async.map(this.node.field(), (name, callback) => {
      const field = this.node.field(name);
      const value = record[name];
      return field.node.send(':parse', value, (err, value) => {
        if (err) return callback(err);
        result[name] = value;
        return callback();
      });
    }, err => {
      return callback(err, result);
    });
  });

  node.on('fetch', function (data, callback) {
    return callback(null, data);
  });

};