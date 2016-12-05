import async from 'async';

export default function (node, logger, Bee) {

  node.kind('Record');

  node.on('-load', function (_, callback) {
    const config = { fqn: this.node.get('mysql.fqn')
                   , name: this.node.get('mysql.name')
                   , table: this.node.get('mysql.table')
                   };
    if (config.fqn == null) return callback(this.node.cwd() + ' needs a configuration');
    return this.node.send(':prepare-workspace', config, err => {
      if (err) return callback(err);
      return callback();
    });
  });

  node.on('prepare-workspace', function (config, callback) {
    return this.node.send(config.fqn + ':get-link', config.name, (err, link) => {
      if (err) return callback(err);
      node.set('link', link);
      if (config.table == null)
        logger.error('Model:', this.node.cwd(), 'needs a table definition');
      else if (typeof config.table == 'string')
        node.set('table', link.table(link.raw('`' + config.table + '`')));
      return callback(null, link);
    });
  });

  node.on('identity-of', 'format', function (value) {
    if (value == null) return null;
    if (parseInt(value, 10) === value) return value;
    if (value.id > 0) return value.id;
    return value;
  });

  node.on('extract-view-factors', function (view) {
    let hasCollection = false;
    const fields = [];
    const filters = {};
    const children = {};
    if (view == null || '*' in view) {
      if (view == null) view = {};
      delete view['*'];
      this.node.field().map(field => {
        if (!(field in view))
          view[field] = null;
      });
    }
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

  node.on('fetch', function (view, callback) {
    const table = this.node.get('table');
    if (table == null) return callback(new Error('Collection have not been configured'));
    return this.node.send(':extract-view-factors', view, (err, factor) => {
      if (err) return callback(err);
      const link = this.node.get('link');
      const query = table.clone();
      query.first(factor.fields.map(n => link.raw('`' + n + '`')));
      for (const key in factor.filters)
        query.whereRaw('`' + key + '` = ?', [factor.filters[key]])
      return query.asCallback((err, result) => {
        if (err) return callback(err);
        if (result == null) return callback(null, null);
        const children = Object.keys(factor.children);
        if (children.length == 0) return callback(null, result);
        return async.map(children, (field, callback) => {
          const view = factor.children[field] || { '*': null };
          const child = this.node.field(field);
          if (child.node.kind() == 'Collection') {
            view.this = result.id;
          } else if (result[field] != null) {
            view.id = result[field];
          } else {
            return callback();
          }
          const fqn = view.$ || ':fetch';
          return child.node.send(fqn, view, (err, value) => {
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

};