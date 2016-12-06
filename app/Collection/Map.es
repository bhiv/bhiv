import async from 'async';

export default function (node, logger) {

  node.kind('Collection');

  node.type(this.args[0]);

  node.inherit('Collection.List<' + this.args[0] + '>');

  node.on('parse', function (map, callback) {
    if (map == null) return callback(null, null);
    const node = this.node.type().node;
    return async.each(Object.keys(map), (key, callback) => {
      return node.emit('parse', map[key], callback);
    }, err => {
      return callback(err, map);
    });
  });

  node.on('map', function (payload, callback) {
    const map = payload.data;
    const list = Object.keys(map);
    if (list == null) return callback(null, null);
    let iterator = payload.iterator || payload.fqn;
    if (typeof iterator == 'string') {
      const fqn = iterator;
      iterator = (type, value, callback) => type.node.send(fqn, value, callback);
    }
    const result = {};
    const type = this.node.type();
    return async.each(list, (key, callback) => {
      return iterator(type, map[key], (err, value) => {
        if (err) return callback(err);
        result[key] = value;
        return callback();
      });
    }, err => {
      return callback(err, result);
    });
  });

};
