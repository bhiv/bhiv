export default function (node, logger) {

  node.kind('Record');

  node.on('-load', function (_, callback) {
    return this.node.send('Type:inflate', this.node, err => {
      return callback(err);
    });
  });

  node.on('parse', 'execute', function (data, callback) {
    if (data == null) return callback(null, null);
    return this.node.send('Type:parse', { node: this.node, data }, callback);
  });

  node.on('parse', 'format', function (record, callback) {
    if (record == null) return callback(null, null);
    const result = {};
    return Yolo.Async.each(this.node.field(), (name, callback) => {
      const field = this.node.field(name);
      const value = record[name];
      return field.node.send(':parse', value, (err, value) => {
        if (err) return callback(err);
        result[name] = value;
        return callback();
      });
    }, err => {
      return callback(err, result);
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

  node.on('produce', function ({ model, data }, callback) {
    const schema = this.node.produce(model);
    return this.node.resolve(schema, data, callback);
  });

};