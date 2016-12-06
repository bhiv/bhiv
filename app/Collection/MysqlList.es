import async from 'async';

export default function (node, logger, Bee) {
  node.kind('Collection');

  node.inherit('Collection.MySQL');
  node.inherit('Collection.List<' + this.args[0] + '>');

  node.on('fetch', function (view, callback) {
    const table = this.node.get('table');
    if (table == null) return callback(new Error('Collection have not been configured'));
    return this.node.send(':extract-view-factors', view, (err, factor) => {
      if (err) return callback(err);
      const link = this.node.get('link');
      return table.clone()
        .select(factor.fields.map(n => link.raw('`' + n + '`')))
        .where(factor.filters)
        .asCallback((err, result) => {
          if (err) return callback(err);
          if (result.length == 0) return callback(null, []);
          const children = Object.keys(factor.children);
          if (children.length == 0) return callback(null, result);
          return async.map(result, (row, callback) => {
            return async.map(children, (field, callback) => {
              const view = factor.children[field] || { '*': true };
              const child = this.node.type().node.field(field);
              if (child.node.kind() == 'Collection') {
                view.this = row.id;
              } else {
                if (row[field] == null) {
                  return callback();
                } else {
                  view.id = row[field];
                }
              }
              const fqn = view.$ || ':fetch';
              return child.node.send(fqn, view, (err, value) => {
                if (err) return callback(err);
                row[field] = value;
                return callback();
              });
            }, (err) => {
              if (err) return callback(err);
              return callback(null, row);
            });
          }, callback);
        });
    });
  });

};
