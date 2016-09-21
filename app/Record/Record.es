import async from 'async';

export default function (node, logger) {

  node.kind('Record');

  const cache = new Yolo.Cache(-1);

  node.on('load', function (_, callback) {
    return async.map(this.node.field(), (key, cb) => {
      const field = this.node.field(key);
      if (cache.has(field.fqn)) {
        field.node = cache.get(field.fqn);
        return cb();
      } else {
        debugger;
        return this.node.create(field.fqn, (err, node) => {
          if (err) return cb(err);
          cache.set(field.fqn, node);
          debugger;
        });
      }
    }, (err) => {
      debugger;
      return callback();
    });
  });

  node.on('fetch', function (data, callback) {
    return callback(null, data);
  });

};