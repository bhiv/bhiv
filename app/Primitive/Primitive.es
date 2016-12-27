export default function (node) {

  node.kind('Primitive');

  node.on('-load', function (_, callback) {
    return this.node.send('Type:inflate', this.node, err => {
      return callback(err);
    });
  });

  node.on('sanitize', function (data, callback) {
    if (data == null) return callback(null, null);
    return this.node.send('Type:sanitize', { node: this.node, data }, (err, result) => {
      if (err) return callback(err);
      return callback(null, result.data);
    });
  });

  node.on('parse', function (data, callback) {
    if (data == null) return callback(null, null);
    return this.node.send('Type:parse', { node: this.node, data }, callback);
  });

  node.on('map', function ({ data }, callback) {
    return callback(null, data);
  });

};
