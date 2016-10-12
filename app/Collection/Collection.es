export default function (node, logger) {

  node.kind('Collection');

  node.on('-load', function (_, callback) {
    var type = this.node.type();
    return this.node.send('Type:get', type.fqn, (err, node) => {
      if (err) return callback(err);
      type.node = node;
      return callback();
    });
  });

};
