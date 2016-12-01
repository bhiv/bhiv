export default function (node, logger) {

  node.kind('Record');

  node.on('parse', function (view, callback) {
    debugger;
  });

  node.on('produce', function (view, callback) {
    debugger;
  });

  node.on('identity-of', function (value, callback) {
    if (value == null) return callback(null, null);
    if (parseInt(value, 10) === value) return callback(null, value);
    const view = { id: null };
    view[this.node.get('main_field') || 'name'] = value;
    return this.node.emit('fetch', view, (err, result) => {
      if (err) return callback(err);
      return callback(null, result.id || null);
    })
  });

  node.check('is-one-of', function (value) {
    logger.notice('can not check', value);
  });

};
