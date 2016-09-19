export default function (node, logger, Bee) {

  node.kind('Record');

  node.on('fetch', function (data, callback) {
    return callback(null, data);
  });

};