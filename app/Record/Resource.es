export default function (node, logger) {

  node.kind('Record');

  node.field('scheme', 'Primitive.String');
  node.field('data', 'Primitive.String');

};
