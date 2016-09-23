export default function (node, logger) {

  const cache = new Yolo.Cache(-1);

  node.on('get', function (fqn, callback) {
    if (cache.has(fqn)) {
      return callback(null, cache.get(fqn));
    } else {
      var waiter = cache.waitFor(fqn, callback);
      if (waiter == null) return ;
      return this.node.create(fqn, (err, result) => {
        if (err) return waiter(err);
        return result.leaf.setParent(this.node).load(result, err => {
          if (err) return waiter(err);
          return waiter(null, result.leaf);
        });
      });
    }
  });

};