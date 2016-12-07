export default function (node, logger, Bee) {

  node.kind('Record');

  node.inherit('Record.MySQL');

  node.identity('this-key', ['this', 'key']);

  node.field('this', 'Primitive.Offset');
  node.field('key', 'Primitive.Key');

};
