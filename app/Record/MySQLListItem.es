export default function (node, logger, Bee) {

  node.kind('Record');

  node.inherit('Record.MySQL');

  node.field('this', 'Primitive.Offset');

};
