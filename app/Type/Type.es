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
    const tn = '[' + node.layout + '] ';
    if (data != null && typeof data != 'object')
      throw new Error(tn + 'Received: "' + data + '" for type ' + node.layout);
    node.field().map(name => {
      const field = node.field(name);
      if (field.options.required === true) {
        if (data == null) throw new Error(tn + 'Data can not be null');
        if (data instanceof Array) throw new Error(tn + 'Data can not be an array');
        if (data[name] == null) throw new Error(tn + 'Field: ' + name + ' is required');
      }
    });
  });

  node.on('sanitize', function ({ node, data, patches }, callback) {
    if (patches == null) patches = node.patch();
    return (function transform(count, patches, rest, data) {
      const patchName = patches.shift();
      const patch = node.patch(patchName);

      if (patch == null) {
        const result = { done: count - rest.length, patches: rest, data };
        return callback(null, result);
      }

      if (patch.length > 1) { // async
        return patch.call(node, data, (err, value) => {
          if (err) return callback(err);
          if (value == null) { rest.push(patchName); value = data; }
          return transform(count, patches, rest, value);
        });
      } else { // sync
        let value = null;
        try { value = patch.call(node, data); }
        catch (err) { return callback(err); }
        if (value == null) { rest.push(patchName); value = data; }
        return transform(count, patches, rest, value);
      }

    })(patches.length, patches, [], data);
  });

  node.on('parse', function ({ node, data }, callback) {
    const defaultCheck = this.node.get('checks.' + node.kind());
    const checks = node.check().map(name => node.check(name));
    if (defaultCheck != null) checks.unshift(defaultCheck);
    return (function walk(data, patches) {
      const check = checks.shift();
      if (check == null) return callback(null, data);
      try { check.call(node, data); }
      catch (e) {
        checks.push(check);
        const payload = { node, data, patches }
        return this.node.emit('sanitize', payload, (err, { done, patches, data }) => {
          if (err) return callback(err);
          if (done == 0) return callback(e);
          return walk.call(this, data, patches);
        });
      }
      return walk.call(this, data, checks, patches);
    }).call(this, data, node.patch(), null, callback);
  });


};
