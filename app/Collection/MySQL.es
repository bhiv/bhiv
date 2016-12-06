import async from 'async';

export default function (node, logger) {
  node.kind('Collection');

  node.on('-load', function (_, callback) {
    const type = this.node.type();
    const config = { fqn: type.node.get('mysql.fqn')
                   , name: type.node.get('mysql.name')
                   , table: type.node.get('mysql.table')
                   };
    if (config.fqn == null) return callback(type.node.cwd() + ' needs a configuration');
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

  node.on('extract-view-factors', function (view, callback) {
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
    return async.map(Object.keys(view), (field, callback) => {
      const child = type.node.field(field);
      if (child == null) {
        logger.warn(type.fqn, 'has undefined field', field);
        return callback();
      } else if (child.node == null) {
        logger.warn(type.fqn, 'has field', field, child.fqn, 'not loaded');
        return callback();
      }
      return child.node.emit('identity-of', view[field], (err, value) => {
        if (err) return callback(err);
        switch (child.node.kind()) {
        case 'Primitive':
          fields.push(field);
          if (value != null) filters[field] = value;
          return callback();
        case 'Record':
          fields.push(field);
          if (typeof value != 'object') {
            if (view[field] == value) {
              children[field] = null;
            } else if (typeof view[field] == 'object' && Object.keys(view[field]).length > 1) {
              children[field] = view[field];
            }
            filters[field] = value;
          } else {
            children[field] = value;
          }
          return callback();
        case 'Collection':
          children[field] = value;
          hasCollection = true;
          return callback();
        default:
          logger.warn(this.node.cwd(), 'has field', field, 'as unknown kind');
          return callback();
        }
      });
    }, err => {
      if (err) return callback(err);
      // TODO: let this keyword be parametred
      if (hasCollection && !~fields.indexOf('this')) fields.unshift('this');
      return callback(null, { fields, filters, children });
    });
  });

};
