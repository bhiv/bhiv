export default function (node, logger) {

  node.on('-load', function (_, callback) {
    const config = { fqn: this.node.get('mysql.fqn')
                   , name: this.node.get('mysql.name')
                   , table: this.node.get('mysql.table')
                   };
    if (config.fqn == null) return callback();
    return this.node.send(':prepare-workspace', config, (err) => {
      if (err) return callback();
      return callback();
    });
  });

  node.on('prepare-workspace', function (config, callback) {
    return this.node.send(config.fqn + ':get-link', config.name, (err, link) => {
      if (err) return callbnack(err);
      node.set(config.name, link);
      node.set('table', link.clone().table(config.table));
      return callback(null, link);
    });
  });

  node.on('parse', 'in', function (data, callback) {
    if (typeof data != 'number') return callback(null, data);
    return this.node.send(':fetch', { filters: { id: data } }, callback);
  });

  node.on('fetch', function (query, callback) {
    return this.node.get('table').clone()
      .select('*')
      .where(query.filters)
      .asCallback(callback);
  });

  node.on('save', function (query, callback) {
    debugger;
  });

  node.on('remove', function (query, callback) {
    debugger;
  });

};