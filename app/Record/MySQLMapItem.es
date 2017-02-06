export default function (node, logger, Bee) {

  node.kind('Record');

  node.inherit('Record.MySQL');

  const key = this.args.length > 0 ? this.args[0].substr(1) : 'key';
  node.set('Map.keyName', key);

  node.identity('this-' + key, ['this', key]);

  node.field('this', 'Primitive.Offset');
  node.field(key, 'Primitive.Key');

};
