import async from 'async';

export default function (node, logger) {

  node.kind('Collection');

  node.type(this.args[0]);

  node.inherit('Collection.List<' + this.args[0] + '>');

  node.on('parse', function (map, callback) {
    if (map == null) return callback(null, null);
    const node = this.node.type().node;
    const hasList = this.node.get('arity') == 'list';
    return async.each(Object.keys(map), (key, callback) => {
      if (hasList) {
        return async.map(map[key], (item, callback) => {
          return node.emit('parse', item, callback);
        }, (err, list) => {
          if (err) return callback(err);
          map[key] = list;
          return callback();
        });
      } else {
        return node.emit('parse', map[key], callback);
      }
    }, err => {
      return callback(err, map);
    });
  });

  node.on('sanitize', function (map, callback) {
    if (map == null) return callback(null, null);
    const node = this.node.type().node;
    const hasList = this.node.get('arity') == 'list';
    return async.each(Object.keys(map), (key, callback) => {
      if (hasList) {
        return async.map(map[key], (item, callback) => {
          return node.emit('sanitize', item, callback);
        }, (err, list) => {
          if (err) return callback(err);
          map[key] = list;
          return callback();
        });
      } else {
        return node.emit('sanitize', map[key], (err, data) => {
          if (err) return callback(err);
          map[key] = data;
          return callback();
        });
      }
    }, err => {
      return callback(err, map);
    });
  });

  node.on('map', function (payload, callback) {
    const map = payload.data;
    if (map == null) return callback(null, null);
    const hasList = this.node.get('arity') == 'list';
    const list = Object.keys(map);
    let iterator = payload.iterator || payload.fqn;
    if (typeof iterator == 'string') {
      const fqn = iterator;
      iterator = (type, value, callback) => type.node.send(fqn, value, callback);
    }
    const result = {};
    const type = this.node.type();
    return async.each(list, (key, callback) => {
      if (hasList) {
        return async.map(map[key], (item, callback) => {
          return iterator(type, item, callback);
        }, (err, list) => {
          if (err) return callback(err);
          result[key] = list;
          return callback();
        });
      } else {
        return iterator(type, map[key], (err, value) => {
          if (err) return callback(err);
          result[key] = value;
          return callback();
        });
      }
    }, err => {
      return callback(err, result);
    });
  });

  node.on('upsert', function (collection, callback) {
    const type = this.node.type();
    const hasList = this.node.get('arity') == 'list';
    const keyType = type.node.field('key');
    const keys = Object.keys(collection);
    const result = {};
    return async.each(keys, (key, callback) => {
      return keyType.node.emit('sanitize', key, (err, keyValue) => {
        if (err) return callback(err);
        return keyType.node.emit('identify', keyValue, (err, value) => {
          if (err) return callback(err);
          if (hasList) {
            return async.map(collection[key], (entry, callback) => {
              entry.key = value;
              return type.node.emit('upsert', entry, callback);
            }, (err, list) => {
              if (err) return callback(err);
              result[key] = list;
              return callback();
            });
          } else {
            const entry = collection[key];
            entry.key = value;
            return type.node.emit('upsert', entry, (err, record) => {
              if (err) return callback(err);
              result[key] = record;
              return callback();
            });
          }
        });
      });
    }, err => {
      return callback(err, result);
    });
  });

};
