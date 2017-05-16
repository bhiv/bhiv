/*!UroxGvT3uDMQCT1va20i43ZZSxo*/

export default function (node, logger) {

  node.kind('Primitive');

  node.on('format', function (result) {
    return result == null ? null : !!result;
  });

};
