import async from 'async';

export default function (node, logger) {

  node.kind('Record');

  node.on('-load', function (_, callback) {
    return this.node.send('Type:inflate', this.node, err => {
      return callback(err);
    });
  });

  node.on('parse', function (record, callback) {
    const result = {};
    return async.map(this.node.field(), (name, callback) => {
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
    return async.map(fields, (field, callback) => {
      if (view && !(field in view)) return callback();
      const childType = this.node.field(field).node;
      if (childType == null) {
        logger.warn(this.node.cwd(), 'field', field, 'is not loaded, use Type:preload');
        return callback('Missing type');
      }
      const subview = view && view[field] || null;
      const method = subview && subview.$ || 'fetch';
      return childType.emit(method, subview, (err, value) => {
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