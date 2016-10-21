import async from 'async';

export default function (node, logger) {
  node.kind('Collection');

  node.inherit('Collection.MySQL');
  node.inherit('Collection.List<' + this.args[0] + '>');

  node.on('extract-view-factors', function (view) {
    let hasCollection = false;
    const fields = [];
    const filters = {};
    const children = {};
    const type = this.node.type()
    if (type.node == null) {
      logger.warn(type.fqn, 'is not loaded, use Type:preload');
      throw new Error('missing type');
    }
    if (view == null || '*' in view) {
      if (view == null) view = {};
      delete view['*'];
      type.node.field().map(field => {
        if (!(field in view))
          view[field] = null;
      });
    }
    for (var field in view) {
      const child = type.node.field(field);
      if (child == null) {
        logger.warn(type.fqn, 'has undefined field', field);
        continue ;
      } else if (child.node == null) {
        logger.warn(type.fqn, 'has field', field, child.fqn, 'not loaded');
        continue ;
      }
      const v = view[field];
      switch (child.node.kind()) {
      case 'Primitive':
        fields.push(field);
        if (v != null) filters[field] = v;
        break ;
      case 'Record':
        fields.push(field);
        children[field] = v;
        break ;
      case 'Collection':
        children[field] = v;
        hasCollection = true;
        break ;
      default:
        logger.warn(this.node.cwd(), 'has field', field, 'as unknown kind');
        break ;
      }
    }
    if (hasCollection && !~fields.indexOf('this'))
      fields.unshift('this');
    return { fields, filters, children };
  });

  node.on('fetch', function (view, callback) {
    const table = this.node.get('table');
    if (table == null) return callback(new Error('Collection have not been configured'));
    return this.node.send(':extract-view-factors', view, (err, factor) => {
      if (err) return callback(err);
      return table.clone()
        .select(factor.fields)
        .where(factor.filters)
        .asCallback((err, result) => {
          if (err) return callback(err);
          if (result.length == 0) return callback(null, []);
          const children = Object.keys(factor.children);
          if (children.length == 0) return callback(null, result);
          return async.map(result, (row, callback) => {
            return async.map(children, (field, callback) => {
              const view = factor.children[field] || { '*': true };
              const child = this.node.type().node.field(field);
              if (child.node.kind() == 'Collection') {
                view.this = row.id;
              } else {
                if (row[field] == null) {
                  return callback();
                } else {
                  view.id = row[field];
                }
              }
              const fqn = view.$ || ':fetch';
              return child.node.send(fqn, view, (err, value) => {
                if (err) return callback(err);
                row[field] = value;
                return callback();
              });
            }, (err) => {
              if (err) return callback(err);
              return callback(null, row);
            });
          }, callback);
        });
    });

  });

};
