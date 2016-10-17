import async from 'async';

export default function (node, logger, Bee) {

  node.kind('Record');

  node.on('-load', function (_, callback) {
    const config = { fqn: this.node.get('mysql.fqn')
                   , name: this.node.get('mysql.name')
                   , table: this.node.get('mysql.table')
                   };
    if (config.fqn == null) return callback();
    return this.node.send(':prepare-workspace', config, err => {
      if (err) return callback(err);
      return callback();
    });
  });

  node.on('prepare-workspace', function (config, callback) {
    return this.node.send(config.fqn + ':get-link', config.name, (err, link) => {
      if (err) return callback(err);
      node.set(config.name, link);
      node.set('table', link.table(config.table));
      return callback(null, link);
    });
  });

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
    if (hasCollection && !~fields.indexOf('id'))
      fields.unshift('id');
    return { fields, filters, children };
  });

  node.on('get', new Bee()
          .pipe(':fetch')
          .pipe(':parse')
          .end()
         );

  node.on('parse', function (data, callback) {
    const result = {};
    return async.map(this.node.field(), (name, callback) => {
      const field = this.node.field(name);
      let value = data[name];
      if (value == null && field.node.kind() == 'Collection') value = data.id;
      return field.node.send(':parse', value, (err, value) => {
        if (err) return callback(err);
        result[name] = value;
        return callback();
      });
    }, (err) => {
      if (err) return callback(err);
      return callback(null, result);
    });
  });

  node.on('fetch', function (view, callback) {
    return this.node.send(':extract-view-factors', view, (err, factor) => {
      if (err) return callback(err);
      return this.node.get('table').clone()
        .first(factor.fields)
        .where(factor.filters)
        .asCallback((err, result) => {
          if (err) return callback(err);
          if (result == null) return callback(null, null);
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

  node.on('save', function (query, callback) {
    debugger;
  });

  node.on('remove', function (query, callback) {
    debugger;
  });

};