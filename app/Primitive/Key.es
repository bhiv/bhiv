export default function (node) {

  node.inherit('Primitive.String');

  node.kind('Primitive');

  node.check('double-dash', function (value) {
    return !~value.indexOf('--');
  });

  const syntaxRxp = /^[a-z0-9]([a-z0-9\-]{0,126}[a-z0-9])?$/;
  node.check('syntax', function (value) {
    if (!syntaxRxp.test(value)) throw new Error('Key syntax error');
  });

  node.check('length', function (value) {
    return value.length > 1;
  });

  node.patch('syntax', function (value) {
    return Yolo.Util.slugify(value);
  });

};
