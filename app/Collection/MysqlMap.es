export default function (node, logger, Bee) {
  node.kind('Collection');

  node.inherit('Collection.MySQL');
  node.inherit('Collection.MysqlList<' + this.args[0] + '>');
  node.inherit('Collection.Map<' + this.args[0] + '>');

  node.on('fetch', function (view, callback) {
    return this.super(view, (err, view) => {
      if (err) return callback(err);
      if (!(view.length > 0)) return callback(null, null);
      const result = {};
      const hasList = this.node.get('arity');
      const keyType = this.node.type().node.field('key');
      return Yolo.Async.each(view, (item, callback) => {
        return keyType.node.send(':key-of', item.key, (err, key) => {
          if (err) return callback(err);
          if (hasList) {
            if (result[key] == null) result[key] = [];
            result[key].push(item);
          } else {
            result[key] = item;
          }
          return callback();
        });
      }, err => {
        return callback(err, result);
      })
    });
  });

};
