import async from 'async';

export default function (node, logger) {

  node.kind('Collection');

  node.type(this.args[0]);

  node.on('parse', 'format', function (list, callback) {
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
      const args = [];
      const data = payload.data;
      const fqn = payload.iterator || payload.fqn;
      const node = this.node.type().node;
      const iterator = (item, callback) => node.send(fqn, item, callback);
      args.push(data, iterator, callback);
      return async[method].apply(async, args);
    });
  });

};
