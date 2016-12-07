import async from 'async';

export default function (node, logger, Bee) {
  node.kind('Collection');

  node.inherit('Collection.MySQL');
  node.inherit('Collection.List<' + this.args[0] + '>');

  node.on('fetch', function (view, callback) {
    const table = this.node.get('table');
    if (table == null) return callback(new Error('Collection have not been configured'));
    const type = this.node.type();
    if (type == null) return callback(new Error('Type for ' + this.layout + 'is not loaded'));
    view.$limit = -1;
    return type.node.emit('fetch', view, callback);
  });

};
