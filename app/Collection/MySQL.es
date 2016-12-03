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
      node.set(config.name, link);
      if (config.table == null)
        logger.error('Model:', this.node.cwd(), 'needs a table definition');
      else if (typeof config.table == 'string')
        node.set('table', link.table(link.raw('`' + config.table + '`')));
      return callback(null, link);
    });
  });

};
