import async from 'async';

export default function (node, logger, Bee) {

  node.kind('Record');

  node.on('-load', function (_, callback) {
    return this.node.send('Type:inflate', this.node, err => {
      return callback(err);
    });
  });

  node.on('get', new Bee()
          .pipe(':deflate')
          .pipe(':fetch')
          .pipe(':parse')
          .pipe(':walk', { data: 'jp:@', fqn: ':get~format' })
          .end()
         );

  node.on('set', new Bee()
          .Go('data')
          .  map('!data', ':parse')
          .  map('!data', ':deflate')
          .Go('identity')
          .  map('!identity', ':deflate')
          .  map('!identity', ':identify')
          .close()
          .pipe(':upsert', 'jp:merge(data, { id: identity.id })')
          .pipe(':walk', { data: 'jp:@', fqn: ':get~format' })
          .end()
         );

  node.on('walk', function ({ data, fqn }, callback) {
    return (function iterator(field, data, callback) {
      return field.node.emit('map', { data, iterator }, (err, result) => {
        if (err) return callback(err);
        return field.node.send(fqn, result, callback);
      });
    })(this, data, callback);
  });

  node.on('map', function ({ data, iterator }, callback) {
    if (data == null) return callback(null, null);
    if (typeof iterator == 'string') {
      const fqn = iterator;
      iterator = (field, value, callback) => {
        return this.node.send(fqn, { field, type: field.node, value }, callback);
      };
    }
    const result = {};
    return Yolo.Async.each(this.node.field(), (name, callback) => {
      const field = this.node.field(name);
      const value = Yolo.Util.getIn(data, name);
      return iterator(field, value, (err, value) => {
        if (err) return callback(err);
        if (value != null) Yolo.Util.setIn(result, name, value);
        return callback();
      });
    }, err => {
      return callback(err, result);
    });
  });

  node.on('parse', function (data, callback) {
    if (data == null) return callback(null, null);
    return this.node.send('Type:parse', { node: this.node, data }, (err, data) => {
      if (err) return callback(err);
      if (data == null) return callback(null, null);
      return this.node.emit('map', { data, iterator: (field, value, callback) => {
        return field.node.emit('parse', value, callback);
      } }, callback);
    });
  });

  node.on('fetch', function (view, callback) {
    const result = {};
    const fields = this.node.field();
    return Yolo.Async.each(fields, (field, callback) => {
      if (view && !(field in view)) return callback();
      const childType = this.node.field(field).node;
      if (childType == null) {
        logger.warn(this.node.cwd(), 'field', field, 'is not loaded, use Type:preload');
        return callback('Missing type');
      }
      const subview = view && view[field] || null;
      const fqn = subview && subview.$ || ':fetch';
      return childType.send(fqn, subview, (err, value) => {
        if (err) return callback(err);
        result[field] = value;
        return callback();
      });
    }, err => {
      if (err) return callback(err);
      return callback(null, result);
    });
  });

  node.on('fetch', 'format', function (record) {
    if (record == null) return null;
    var result = {};
    for (var key in record) {
      if (~key.indexOf('.')) Yolo.Util.setIn(result, key, record[key]);
      else result[key] = record[key];
    }
    return result;
  });

  node.on('deflate', function (data, callback) {
    const fields = this.node.field();
    const flat = {};
    return async.each(fields, (name, callback) => {
      const field = this.node.field(name);
      const value = name in data ? data[name] : Yolo.Util.getIn(data, name);
      if (value == null) return callback();
      return field.node.emit('parse', value, (err, result) => {
        if (err) return callback(err);
        flat[name] = result;
        return callback();
      })
    }, err => {
      return callback(err, flat);
    });
  });

  node.on('identify', function (data, callback) {
    if (data == null) return callback(null, data);
    const view = { '*': false };
    const identities = this.node.identity();
    let fields = null;
    for (let i = 0; i < identities.length; i++) {
      const identity = this.node.identity(identities[i]);
      for (let ii = 0; ii < identity.length; ii++) {
        const fieldName = identity[ii];
        if (!(fieldName in view))
          view[fieldName] = data[fieldName] != null ? data[fieldName] : null;
        if (fields != null) break ;
        if (Yolo.Util.getIn(data, identity[ii]) == null) break ;
        fields = identity;
      }
    }
    if (fields == null) return callback(null, data);
    return this.node.emit('fetch', view, (err, result) => {
      if (err) return callback(err);
      if (result == null) return callback(null, data);
      for (const fieldName in result)
        if (!(fieldName in data))
          data[fieldName] = result[fieldName];
      return callback(null, data);
    });
  });

  node.on('produce', function ({ model, data }, callback) {
    const schema = this.node.produce(model);
    return this.node.resolve(schema, data, callback);
  });

};
