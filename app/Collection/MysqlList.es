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
    for (var field in view) {
      const child = this.node.field(field);
      if (child == null) {
        logger.warn(this.node.cwd(), 'has undefined field', field);
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
    return this.node.send(':extract-view-factors', view, (err, factor) => {
      if (err) return callback(err);
      return this.node.get('table').clone()
        .select(factor.fields)
        .where(factor.filters)
        .asCallback((err, result) => {
          if (err) return callback(err);
          if (result.length == 0) return callback(null, []);
          
          const children = Object.keys(factor.children);
          if (children.length == 0) return callback(null, result);
          return async.map(children, (field, callback) => {
            const view = factor.children[field];
            const child = this.node.field(field);
            if (child.node.kind() == 'Collection') {
              view.this = result.id;
            } else {
              view.id = result[field];
            }
            return child.node.send(':fetch', view, (err, value) => {
              if (err) return callback(err);
              result[field] = value;
              return callback();
            });
          }, (err) => {
            if (err) return callback(err);
            return callback(null, result);
          });
        });
    });

  });

  node.on('parse', function (data, callback) {
    if (typeof data == 'number') {
      return this.node.send(':fetch', { filters: { this: data } }, (err, list) => {
        if (err) return callback(err);
        return this.node.send(':parse', list, callback);
      });
    } else if (data instanceof Array) {
      const type = this.node.type();
      return async.map(data, (item, cb) => {
        return type.node.send(':parse', item, cb);
      }, callback);
    } else {
      return callback(new Error('Bad data type'));
    }
  });

};
