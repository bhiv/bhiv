export default function (node, logger, Bee) {

  node.kind('Record');

  node.on('-load', function (_, callback) {
    return this.node.send('Type:inflate', this.node, err => {
      return callback(err);
    });
  });

  node.on('get', new Bee()
          .pipe(':fetch')
          .pipe(':parse')
          .end()
         );

  node.on('set', new Bee()
          .pipe(':parse', 'jp:data', { data: 'jp:@' })
          .pipe(':save')
          .end()
         );

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

  node.on('parse', 'execute', function (data, callback) {
    if (data == null) return callback(null, null);
    return this.node.send('Type:parse', { node: this.node, data }, callback);
  });

  node.on('parse', 'format', function (record, callback) {
    return this.node.emit('map', { data: record, iterator: (field, value, callback) => {
      return field.node.emit('parse', value, callback);
    } }, callback);
  });

  node.on('fetch', function (view, callback) {
    const result = {};
    const fields = this.node.field();
    return Yolo.Async.each(fields, (field, callback) => {
      if (typeof view == 'number') debugger;
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

  node.on('produce', function ({ model, data }, callback) {
    const schema = this.node.produce(model);
    return this.node.resolve(schema, data, callback);
  });

  node.on('save', function (data, callback) {
    return this.node.emit('map', { data, iterator: (field, data, callback) => {
      if (data == null) return callback(null, null);
      if (field.node.hasLayout('Record.Enum')) {
        return field.node.emit('fetch', data, callback);
      } else if (field.node.hasLayout('Collection')) {
        return field.node.emit('save-relations', data, callback);
      } else if (field.node.hasLayout('Primitive')) {
        return callback(null, data);
      } else {
        const view = Yolo.Util.merge({ '*': true }, data);
        return field.node.emit('fetch', view, callback);
      }
    } }, callback);
  });

};