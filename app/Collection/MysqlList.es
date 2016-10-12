import async from 'async';

export default function (node, logger) {
  node.kind('Collection');

  node.inherit('Collection.MySQL');
  node.inherit('Collection.List<' + this.args[0] + '>');

  node.on('fetch', function (query, callback) {
    const type = this.node.type();
    return this.node.get('table').clone()
      .select('*')
      .where(query.filters)
      .asCallback((err, list) => {
        if (err) return callback(err);
        return this.node.send(':parse', list, callback);
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
