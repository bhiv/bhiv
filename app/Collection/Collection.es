import async from 'async';

export default function (node, logger) {

  node.kind('Collection');

  node.on('-load', function (_, callback) {
    return this.node.send('Type:inflate', this.node, err => {
      return callback(err);
    });
  });

  node.on('parse', 'execute', function (data, callback) {
    return this.node.send('Type:parse', { node: this.node.type().node, data }, callback);
  });

};
