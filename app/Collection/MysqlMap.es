import async from 'async';

export default function (node, logger, Bee) {
  node.kind('Collection');

  node.inherit('Collection.MySQL');
  node.inherit('Collection.MysqlList<' + this.args[0] + '>');
  node.inherit('Collection.Map<' + this.args[0] + '>');

  node.on('fetch', 'format', function (view) {
    if (!(view.length > 0)) return null;
    const result = {};
    for (let i = 0; i < view.length; i++)
      result[view[i].key] = view[i];
    return result;
  });

};
