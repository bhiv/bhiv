export default function (node, logger) {

  node.kind('Record');

  node.field('name', 'Primitive.String', { unique: true });

  node.set('dependency.update', false);

  node.on('parse', function (view) {
    if (typeof view == 'object') return view;
    const main = this.node.get('main_field') || 'name';
    const field = this.node.field(main);
    if (field == null) return view;
    const record = {};
    record[main] = view;
    return record;
  });

  node.on('identity-of', function (value, callback) {
    if (value == null) return callback(null, null);
    if (parseInt(value, 10) === value) return callback(null, value);
    const view = { id: null };
    view[this.node.get('main_field') || 'name'] = value;
    return this.node.emit('fetch', view, (err, result) => {
      if (err) return callback(err);
      if (result == null) return callback(null, null);
      return callback(null, result.id);
    })
  });

  node.check('is-one-of', function (value) {
    logger.notice('can not check', value);
  });

  node.patch('wrap', function (data) {
    const type = typeof data;
    if (type != 'string' && type != 'number') return null;
    return { name: data };
  });

};
