export default function (node, logger) {

  node.kind('Record');

  node.field('scheme', 'Primitive.String', true);
  node.field('data', 'Primitive.String', true);

};
