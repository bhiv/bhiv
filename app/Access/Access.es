export default function (node, logger, Bee) {

  node.on('extract-http-access', 'in', function (payload, callback) {
    const access = {};
    if (payload.params.access_token != null)
      access.token = payload.params.access_token;
    return callback(null, { access });
  });

};