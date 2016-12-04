export default function (node, logger) {

  node.kind('Record');

  node.field('scheme', 'Primitive.String', true);
  node.field('data', 'Primitive.String', true);

  node.patch('explode-url', function (url) {
    if (typeof url != 'string') return url;
    const mark = url.indexOf(':');
    if (!(mark > 0)) return url;
    return { scheme: url.substr(0, mark + 1)
           , data: url.substr(mark + 1)
           };
  });

};
