/*!UroxGvT3uDMQCT1va20i43ZZSxo*/
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
    if (!(value.length > 0)) throw new Error('Bad length');
  });

  node.patch('syntax', function (value) {
    if (value == null) return null;
    return Bhiv.Util.slugify(value);
  });

};
