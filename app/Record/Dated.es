export default function (node, logger, Bee) {

  node.kind('Record');

  node.field('created_at', 'Primitive.DateTime');
  node.field('modified_at', 'Primitive.DateTime');
  node.field('removed_at', 'Primitive.DateTime');

};