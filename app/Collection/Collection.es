import async from 'async';

export default function (node, logger) {

  node.kind('Collection');

  node.on('-load', function (_, callback) {
    return this.node.send('Type:inflate', this.node, err => {
      return callback(err);
    });
  });

  node.on('parse', 'execute', function (data, callback) {
    return this.node.send('Type:parse', { node: this.node, data }, callback);
  });

  node.on('fetch-relations', function (data, callback) {
    return this.node.emit('map', { data, iterator: (type, data, callback) => {
      return type.node.emit('fetch-relations', data, callback);
    } }, callback);
  });

};
