export default function (node, logger) {
  node.kind('Collection');

  node.on('-load', function (_, callback) {
    const type = this.node.type();
    const config = { fqn: type.node.get('mysql.fqn')
                   , name: type.node.get('mysql.name')
                   , table: type.node.get('mysql.table')
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
      node.set('table', link.table(config.table).clone());
      return callback(null, link);
    });
  });

};
