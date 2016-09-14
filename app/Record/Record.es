export default function (node, logger, Bee) {

  node.on('list', 'out', function (data, callback) {
    console.log(data);
    return callback(null, data);
  });

};