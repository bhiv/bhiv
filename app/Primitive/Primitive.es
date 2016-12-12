export default function (node) {

  node.kind('Primitive');

  node.on('-load', function (_, callback) {
    return this.node.send('Type:inflate', this.node, err => {
      return callback(err);
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
