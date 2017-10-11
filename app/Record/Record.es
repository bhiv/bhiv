// UroxGvT3uDMQCT1va20i43ZZSxo
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
  node.on('parse', function (data, callback) {
    if (data == null) return callback(null, null);
    return this.node.send('Type:parse', { node: this.node, data }, (err, data) => {
      if (err) return callback(err);
      if (data == null) return callback(null, null);
      return this.node.execute('map', { data, iterator: (field, value, callback) => {
        return field.node.execute('parse', value, callback);
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
      return this.node.execute('map', { data, iterator: (field, value, callback) => {
        return field.node.execute('sanitize', value, callback);
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
        Bhiv.Util.setIn(record, fieldName, data[fieldName]);
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
      const value = fieldName in data ? data[fieldName] : Bhiv.Util.getIn(data, fieldName);
      flat[fieldName] = value;
    }
    if (data['*']) flat['*'] = true;
    return flat;
  });

};
