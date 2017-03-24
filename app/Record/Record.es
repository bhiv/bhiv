import async from 'async';

export default function (node, logger, Bee) {

  node.kind('Record');

  node.on('-load', function (slice, callback) {
    return this.node.send('Type:inflate', this.node, err => {
      if (err) return callback(err);
      return this.super(slice, callback);
    });
  });

  // inflated
  node.on('get', new Bee()
          .pipe(':sanitize')
          .pipe(':deflate')
          .pipe(':fetch')
          .pipe(':parse')
          .pipe(':walk', { data: 'jp:@', fqn: ':format' })
          .end()
         );

  // inflated
  node.on('set', new Bee()
          .Go('identity')
          .  map('!identity', ':inflate')
          .  map('!identity', ':sanitize')
          .  map('!identity', ':deflate')
          .  map('!identity', ':identify')
          .Go('data')
          .  map('!data', ':parse')
          .  map('!data', ':deflate')
          .close()
          .pipe(':upsert', 'jp:merge(data, { id: identity.id })')
          .pipe(':walk', { data: 'jp:@', fqn: ':format' })
          .end()
         );

  // inflated
  node.on('put', { $: ':set', _: { data: 'jp:@' } });

  // inflated
  node.on('walk', function ({ data, fqn }, callback) {
    return (function iterator(field, data, callback) {
      return field.node.emit('map', { data, iterator }, (err, result) => {
        if (err) return callback(err);
        return field.node.send(fqn, result, callback);
      });
    })(this, data, (err, result) => {
      if (err) return callback(err);
      return this.node.send(fqn, result, callback);
    });
  });

  // inflated
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

  // inflated
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

  // inflated
  node.on('sanitize', function (data, callback) {
    if (data == null) return callback(null, null);
    return this.node.send('Type:sanitize', { node: this.node, data }, (err, result) => {
      if (err) return callback(err);
      const data = result.data;
      if (data == null) return callback(null, null);
      if (typeof data != 'object') return callback(null, null);
      return this.node.emit('map', { data, iterator: (field, value, callback) => {
        return field.node.emit('sanitize', value, callback);
      } }, callback);
    });
  });

  // deflated
  node.on('inflate', function (data) {
    if (data == null) data = {};
    const fields = this.node.field();
    const record = {};
    for (const fieldName in data) {
      if (fieldName.substr(0, 1) == '$') {
        record[fieldName] = data[fieldName];
      } else {
        const field = this.node.field(fieldName);
        if (field == null) continue ;
        Yolo.Util.setIn(record, fieldName, data[fieldName]);
      }
    }
    if (data['*']) record['*'] = true;
    return record;
  });

  // inflated
  node.on('deflate', function (data) {
    if (data == null) data = {};
    const fields = this.node.field();
    const flat = {};
    for (let i = 0; i < fields.length; i++) {
      const fieldName = fields[i];
      const value = fieldName in data ? data[fieldName] : Yolo.Util.getIn(data, fieldName);
      flat[fieldName] = value;
    }
    if (data['*']) flat['*'] = true;
    return flat;
  });

  // deflated
  node.on('identify', function (data, callback) {
    if (data == null) return callback(null, data);
    const view = { '*': data['*'] || false };
    const identities = this.node.identity();
    const fields = [];
    let found = false;
    id: for (let i = 0; i < identities.length; i++) {
      const identity = this.node.identity(identities[i]);
      for (let ii = 0; ii < identity.fields.length; ii++) {
        if (!(identity.fields[ii] in view)) view[identity.fields[ii]] = null;
        if (!~fields.indexOf(identity.fields[ii])) fields.push(identity.fields[ii]);
      }
      if (!found) {
        for (let ii = 0; ii < identity.fields.length; ii++) {
          const fieldName = identity.fields[ii];
          if (data[fieldName] == null) continue id;
          view[fieldName] = data[fieldName];
        }
        for (const key in identity.constraints)
          if (identity.constraints[key] != data[key])
            continue id;
        found = true;
      }
    }
    if (!found) return callback(null, data);
    return this.node.emit('fetch', view, (err, result) => {
      if (err) return callback(err);
      if (result == null) return callback(null, data);
      for (let  i = 0; i < fields.length; i++) {
        const fieldName = fields[i];
        const value = Yolo.Util.getIn(result, fieldName);
        data[fieldName] = Yolo.Util.merge(data[fieldName], value);
      }
      return callback(null, data);
    });
  });

  // deflated
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
      if (subview == null) return callback();
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

};
