import async from 'async';

export default function (node, logger) {
  node.kind('Collection');

  node.on('-load', function (slice, callback) {
    return this.super(slice, (err, slice) => {
      if (err) return callback(err);
      const type = this.node.type();
      const config = { fqn: type.node.get('mysql.fqn')
                     , name: type.node.get('mysql.name')
                     , table: type.node.get('mysql.table')
                     };
      if (config.fqn == null) return callback(type.node.cwd() + ' needs a configuration');
      return this.node.send(':prepare-workspace', config, err => {
        if (err) return callback(err);
        return callback(null, slice);
      });
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

  node.on('delete', function (request, callback) {
    const link = this.node.get('link');
    const table = this.node.get('table');
    if (link == null || table == null)
      throw new Error('Collection have not been configured');
    if (request.this == null) {
      return callback('Must have `this` field constraint to proceed delete');
    } else {
      return table.clone().where(request).del().asCallback(callback);
    }
  });

};
