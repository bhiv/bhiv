import async from 'async';

export default function (node, logger) {

  const loading = new Yolo.Cache(-1);

  node.on('instanciate', function (type, callback) {
    const key = 'types.' + Yolo.Digest(type.fqn);
    const node = this.node.get(key);
    if (node != null) {
      // type is loaded
      type.node = node;
      return callback(null, type);
    } else if (loading.has(type.fqn)) {
      // type is been loading
      loading.get(type.fqn).push(node => { type.node = node });
      return callback(null, type);
    } else {
      // type is not loading
      loading.set(type.fqn, [node => { type.node = node }]);
      return this.node.create(type.fqn, (err, result) => {
        if (err) return callback(err);
        const node = result.leaf;
        node.setParent(this.node);
        this.node.set(key, node);
        loading.pick(type.fqn).map(fn => fn(node));
        return node.emit('-load', result, (err) => {
          if (err) return callback(err);
          return callback(err, type);
        });
      });
    }
  });

  node.on('inflate', function (node, callback) {
    switch (node.kind()) {
    case 'Collection':
      return this.node.send(':instanciate', node.type(), err => {
        return callback(err, node)
      });
    case 'Record':
      const fields = node.field();
      return async.map(fields, (name, callback) => {
        return this.node.send(':instanciate', node.field(name), callback);
      }, err => {
        return callback(err, node);
      });
    case 'Primitive':
      return callback(null, node);
    default :
      return callback('Unhandled model kind');
    }
  });

};
