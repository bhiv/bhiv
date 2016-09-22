export default function (node, logger) {

  node.kind('Collection');

  const cache = new Yolo.Cache(-1);

  node.on('load', function (_, callback) {
    var type = this.node.type();
    if (cache.has(type.fqn)) {
      type.node = cache.get(type.fqn);
      return callback();
    } else {
      return this.node.create(type.fqn, (err, node) => {
        if (err) return cb(err);
        cache.set(type.fqn, node);
        type.node = node;
        return callback();
      });
    }
  });

  node.on('fetch', function (query, callback) {
    var type = this.node.type();
    debugger;
  });

};
