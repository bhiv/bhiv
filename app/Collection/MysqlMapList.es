import async from 'async';

export default function (node, logger, Bee) {
  node.kind('Collection');

  node.inherit('Collection.MysqlMap<' + this.args[0] + '>');
  node.set('arity', 'list');

};
