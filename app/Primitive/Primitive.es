export default function (node) {

  node.kind('Primitive');

  node.on('-load', function (_, callback) {
    return this.node.send('Type:inflate', this.node, err => {
      return callback(err);
    });
  });

  node.on('parse', 'execute', function (data, callback) {
    return this.node.send('Type:parse', { node: this.node, data }, callback);
  });

};
