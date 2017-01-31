import async from 'async';

export default function (node, logger) {

  node.kind('Collection');

  node.on('-load', function (slice, callback) {
    return this.node.send('Type:inflate', this.node, err => {
      if (err) return callback(err);
      return this.super(slice, callback);
    });
  });

  node.on('parse', function (data, callback) {
    return this.node.send('Type:parse', { node: this.node, data }, callback);
  });

  node.on('fetch-relations', function (data, callback) {
    return this.node.emit('map', { data, iterator: (type, data, callback) => {
      return type.node.emit('fetch-relations', data, callback);
    } }, callback);
  });

  node.on('map', function ({ data, iterator }, callback) {
    if (typeof iterator == 'string') {
      const fqn = iterator;
      iterator = (field, value, callback) => {
        return this.node.send(fqn, { field, type: field.node, value }, callback);
      };
    }
    return iterator(this.node.type(), data, callback);
  });

};
