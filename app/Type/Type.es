export default function (node, logger) {

  const loaded = new Yolo.Cache(-1);

  node.on('get', function (fqn, callback) {
    if (loaded.has(fqn)) {
      return callback(null, loaded.get(fqn));
    } else {
      var waiter = loaded.waitFor(fqn, callback);
      if (waiter == null) return ;
      return this.node.create(fqn, (err, result) => {
        if (err) return waiter(err);
        result.leaf.setParent(this.node);
        waiter(null, result.leaf);
        return result.leaf.emit('-load', result);
      });
    }
  });

};