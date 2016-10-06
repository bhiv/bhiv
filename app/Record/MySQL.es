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
      node.set('table', link.table(config.table));
      return callback(null, link);
    });
  });

  node.on('parse', function (data, flux) {
    if (typeof data == 'number') {
      return this.node.send(':fetch', { filters: { id: data } }, (err, data) => {
        if (err) return flux(err);
        return this.node.send(':parse', data, flux);
      });
    } else if (data && typeof data == 'object') {
      const result = {};
      return async.map(this.node.field(), (name, callback) => {
        const field = this.node.field(name);
        let value = record[name];
        if (value == null && field.node.kind() == 'Collection') { value = data.id; debugger; }
        return field.node.send(':parse', value, (err, value) => {
          if (err) return callback(err);
          result[name] = value;
          return callback();
        });
      }, err => {
        if (err) return flux(err);
        else return flux.emit('success', result);
      });
    } else {
      return flux(null, data);
    }
  });

  node.on('fetch', function (query, callback) {
    return this.node.get('table').clone()
      .first('*')
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