export default function (node) {

  node.inherit('Primitive.Text');

  node.kind('Primitive');

  node.check('double-dash', function (value) {
    return !~value.indexOf('--');
  });

  const syntaxRxp = /^[a-z0-9]([a-z0-9\-]{0,126}[a-z0-9])?$/;
  node.check('syntax', function (value) {
    return syntaxRxp.text(value);
  });

  node.check('length', function (value) {
    return value.length > 1;
  });

  node.fix('syntax', function (value) {
    return Yolo.Util.slugify(value);
  });

};
