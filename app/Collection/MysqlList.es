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

};
