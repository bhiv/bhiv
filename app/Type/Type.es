import async from 'async';

export default function (node, logger, Bee) {

  const loading = new Yolo.Cache(-1);

  node.on('instanciate', function (type, callback) {
    const key = 'types.' + Yolo.Digest(type.fqn);
    const node = this.node.get(key);
    if (node != null) {
      // type is loaded
      type.node = node;
      return callback(null, type);
    } else if (loading.has(type.fqn)) {
      // type is been loading
      loading.get(type.fqn).push(node => { type.node = node });
      return callback(null, type);
    } else {
      // type is not loading
      loading.set(type.fqn, [node => { type.node = node }]);
      return this.node.create(type.fqn, (err, result) => {
        if (err) return callback(err);
        const node = result.leaf;
        node.setParent(this.node);
        this.node.set(key, node);
        loading.pick(type.fqn).map(fn => fn(node));
        return node.emit('-load', result, err => {
          return callback(err, type);
        });
      });
    }
  });

  node.on('inflate', function (node, callback) {
    switch (node.kind()) {
    case 'Collection':
      return this.node.send(':instanciate', node.type(), err => {
        return callback(err, node)
      });
    case 'Record':
      const fields = node.field();
      return async.map(fields, (name, callback) => {
        return this.node.send(':instanciate', node.field(name), callback);
      }, err => {
        return callback(err, node);
      });
    case 'Primitive':
      return callback(null, node);
    default :
      return callback('Unhandled model kind');
    }
  });

  node.set('checks.Record', function (data) {
    const node = this;
    node.field().map(name => {
      const field = node.field(name);
      if (field.options.required === true) {
        if (data == null) throw new Error('Data can not be null');
        if (data[name] == null) throw new Error('Field: ' + name + ' is required');
      }
    });
  });

  node.on('parse', function ({ node, data }, callback) {
    const defaultCheck = this.node.get('checks.' + node.kind());
    const checks = node.check().map(name => node.check(name));
    if (defaultCheck != null) checks.unshift(defaultCheck);
    return (function walk(data, checks, patches, error) {
      const check = checks.shift();
      if (check == null) return callback(error, data);
      try {
        check.call(node, data);
      } catch (e) {
        if (patches.length > 0) {
          error = e;
          checks.unshift(check);
          return node.patch(patches.shift()).call(node, data, (err, value) => {
            if (err) {
              logger.warn(err);
              return walk.call(this, data, checks, patches, error);
            } else {
              return walk.call(this, value, checks, patches, error);
            }
          });
        } else {
          return callback(e);
        }
      }
      return walk.call(this, data, checks, patches, null);
    }).call(this, data, checks, node.patch(), null, callback);
  });


};
