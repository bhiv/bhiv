export default function (node, logger) {

  node.kind('Primitive');

  node.patch('format', function (data) {
    if (data == null || typeof data != 'object') return data;
    const key = [];
    for (const k in data) {
      if (k == 'id') continue ;
      key.push(k + ':' + data[k]);
    }
    return key.sort().join(' ');
  });

};
