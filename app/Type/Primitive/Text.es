export default function (node) {

  node.kind('Primitive');

  node.check('js-type', function (value) {
    return typeof value == 'string';
  });

  node.fix('js-type', function (value) {
    switch (Object.prototype.toString.call(value)) {
    case '[object String]':
    case '[object Number]':
      return '' + value;
    }
    return null;
  });

};
