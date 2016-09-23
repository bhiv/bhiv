import async from 'async';

export default function (node, logger) {

  node.kind('Record');

  node.on('load', function (_, callback) {
    return async.map(this.node.field(), (name, cb) => {
      const field = this.node.field(name);
      return this.node.send('Type:get', field.fqn, (err, node) => {
        if (err) return cb(err);
        field.node = node;
        return cb(null, node);
      });
    }, (err) => {
      return callback(err);
    });
  });

  node.on('fetch', function (data, callback) {
    return callback(null, data);
  });

};