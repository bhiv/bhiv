export default function (node, logger) {

  node.on('load', function (_, callback) {
    const config = { fqn: this.node.get('mysql.fqn')
                   , name: this.node.get('mysql.name')
                   , table: this.node.get('mysql.table')
                   };
    if (config == null) return callback();
    return this.node.send(':prepare-workspace', config, (err) => {
      if (err) return callback();
      return callback();
    });
  });

  node.on('prepare-workspace', function (config, callback) {
    return this.node.send(config.fqn + ':get-link', config.name, (err, link) => {
      if (err) return callbnack(err);
      node.set(config.name, link);
      node.set('table', link.table(config.table).clone());
      const fields = this.node.field();
      for (let i = 0; i < fields.length; i++) {
        const name = fields[i];
        const field = this.node.field(name);
        if (field.fqn.indexOf('Collection.') !== 0) continue ;
        const table = link.table(config.table + '-' + name).clone();
        node.set('table-' + name, table);
        ['fetch', 'save', 'remove'].map(action => {
          node.on(action + '-' + name, (query, callback) => {
            return node.send(action + '-x', { table, field, query }, callback);
          });
        });
      }
      return callback(null, link);
    });
  });

  node.on('fetch', function (query, callback) {
    debugger;
  });

  node.on('save', function (query, callback) {
    debugger;
  });

  node.on('remove', function (query, callback) {
    debugger;
  });

  node.on('fetch-x', function ({ table, field, query }, callback) {
    debugger;
  });

  node.on('save-x', function ({ table, field, query }, callback) {
    debugger;
  });

  node.on('remove-x', function ({ table, field, query }, callback) {
    debugger;
  });

};