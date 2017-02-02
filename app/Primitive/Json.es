export default function (node, logger) {

  node.kind('Primitive');

  node.on('parse', function (data) {
    if (data == null) return data;
    return JSON.stringify(data);
  });

};
