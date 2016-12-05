import async from 'async';

export default function (node, logger) {

  node.kind('Collection');

  node.type(this.args[0]);

  node.on('parse', 'format', function (list, callback) {
    if (list == null) return callback(null, null);
    const node = this.node.type().node;
    return async.map(list, (item, callback) => {
      return node.send(':parse', item, callback);
    }, callback);
  });

  [ 'concat', 'detect', 'each', 'eachOf'
  , 'every', 'map', 'reject'
  , 'some', 'sortBy'
  ].map((method) => {
    node.on(method, function (payload, callback) {
      if (payload.data == null) return callback(null, null);
      if (payload.data.length == 0) return callback(null, []);
      let iterator = payload.iterator || payload.fqn;
      if (typeof iterator == 'string') {
        const fqn = iterator;
        iterator = (type, value, callback) => {
          return type.node.send(fqn, value, callback);
        };
      }
      const type = this.node.type();
      return async[method](payload.data, (item, callback) => {
        return iterator(type, item, callback);
      }, callback);
    });
  });

};
