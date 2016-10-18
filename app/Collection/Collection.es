export default function (node, logger) {

  node.kind('Collection');

  node.on('-load', function (_, callback) {
    return this.node.send('Type:inflate', this.node, err => {
      return callback(err);
    });
  });

};
