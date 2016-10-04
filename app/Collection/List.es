import async from 'async';

export default function (node, logger) {

  node.kind('Collection');

  node.type(this.args[0]);

  node.on('parse', function (list, callback) {
    const node = this.node.type().node;
    return async.map(list, (item, callback) => {
      return node.send(':parse', item, callback);
    }, callback);
  });

};
