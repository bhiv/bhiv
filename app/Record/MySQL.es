import async from 'async';
import helper from './MySQL.helper.es';

export default function (node, logger, Bee) {

  node.kind('Record');

  node.identity('id', ['id']);

  node.field('id', 'Primitive.Offset');

  node.on('-load', function (_, callback) {
    const config = { fqn: this.node.get('mysql.fqn')
                   , name: this.node.get('mysql.name')
                   , table: this.node.get('mysql.table')
                   };
    if (config.fqn == null) return callback(this.node.cwd() + ' needs a configuration');
    return this.node.send(':prepare-workspace', config, err => {
      if (err) return callback(err);
      return callback();
    });
  });

  node.on('prepare-workspace', function (config, callback) {
    return this.node.send(config.fqn + ':get-link', config.name, (err, link) => {
      if (err) return callback(err);
      node.set('link', link);
      if (config.table == null)
        logger.error('Model:', this.node.cwd(), 'needs a table definition');
      else if (typeof config.table == 'string')
        node.set('table', link.table(link.raw('`' + config.table + '`')));
      return callback(null, link);
    });
  });

  /***/

  node.on('fetch-all', function (view, callback) {
    view.$limit = -1;
    return this.node.emit('fetch', view, callback);
  });

  node.on('fetch', new Bee()
          .extract({ request: 'jp:@' })
          .then(':fetch-prepare-range')
          .then(':fetch-prepare-fields')
          .then(':fetch-prepare-filters')
          .trap({ message: 'DEEP_FILTER_NOT_FOUND' }, ':fetch-format')
          .Each('unknowns', null, 'subrequest')
          .  then(':fetch-prepare-children-filters')
          .close()
          .then(':fetch-build')
          .then(':fetch-execute')
          .then(':fetch-children')
          .pipe(':fetch-format')
          .end()
         );

  node.on('fetch-prepare-range', function ({ request }) {
    const result = { pagination: { offset: 0, limit: 1 } };
    if (request.$limit != null)
      result.pagination.limit = request.$limit >= 0 ? request.$limit : null;
    if (request.$offset != null)
      result.pagination.offset = request.$offset > 0 ? request.$offset : 0;
    return result;
  });

  node.on('fetch-prepare-fields', function ({ request }) {
    const result = { plucks: [], fields: [], children: {} };
    if (request['*']) {
      const fields = this.node.field();
      for (let i = 0; i < fields.length; i++) {
        const fieldName = fields[i];
        if (fieldName in request) continue ;
        request[fieldName] = { '*': true };
      }
    } else {
      const fields = this.node.field();
      for (let i = 0; i < fields.length; i++) {
        const fieldName = fields[i];
        if (fieldName in request) continue ;
        if (!this.node.field(fieldName).options.required) continue ;
        request[fieldName] = { '*': true };
      }
    }
    const fieldsList = [];
    for (const field in request) fieldsList.push(field);
    for (let i = 0; i < fieldsList.length; i++) {
      const fieldName = fieldsList[i];
      if (fieldName == '*' || fieldName.substr(0, 1) == '$') continue ;
      const field = this.node.field(fieldName);
      if (field == null) {
        logger.warn(this.node.layout, 'Unknown field: ' + fieldName + ' has been requested');
      } else {
        switch (field.node.kind()) {
        case 'Primitive':
          result.fields.push(fieldName);
          if (!('$pluck' in request)) result.plucks.push(fieldName);
          break ;
        case 'Record':
          result.fields.push(fieldName);
          if (!('$pluck' in request)) result.plucks.push(fieldName);
          /* no break */
        case 'Collection':
          let child = Yolo.Util.getIn(request, fieldName);
          child = child != null ? Object.create(child) : {};
          child['*'] = true;
          result.children[fieldName] = child;
          if (!~fieldsList.indexOf('id')) fieldsList.push('id');
          break ;
        default :
          logger.warn(this.node.layout, 'Field: ' + fieldName + ' has no kind');
          break ;
        }
      }
    }
    for (const name in request.$pluck) {
      const value = request.$pluck[name];
      if (value != null) result.plucks.push('sql:' + value + ' as `' + name + '`');
      else result.plucks.push(name);
    }
    return result;
  });

  node.on('fetch-prepare-filters', function ({ request, fields, children }) {
    const result = { filters: [], unknowns: [] };
    for (let i = 0; i < fields.length; i++) {
      const fieldName = fields[i];
      const value = request[fieldName];
      if (value == null) continue ;
      switch (this.node.field(fieldName).node.kind()) {
      case 'Primitive':
        if (typeof value != 'object' || value instanceof Array)
          result.filters.push(helper.AST.FieldValueEquality(fieldName, value));
        break ;
      case 'Record':
        if (value.id != null) {
          result.filters.push(helper.AST.FieldValueEquality(fieldName, value.id));
        } else {
          result.unknowns.push({ name: fieldName, view: value });
        }
        break ;
      case 'Collection':
        throw new Error('Filter through Collection is not yet implemented');
        break ;
      }
    }
    return result;
  });

  node.on('fetch-prepare-children-filters', function (payload, callback) {
    const { filters, subrequest: { name, view } } = payload;
    let hasFilter = false;
    for (const fieldName in view) {
      if (fieldName == '*') continue ;
      if (fieldName.substr(0, 1) == '$') continue ;
      if (view[fieldName] == null) continue ;
      hasFilter = true;
      break ;
    }
    if (!hasFilter) return callback(null, {});
    if (!('id' in view)) view.id = null;
    return this.node.field(name).node.emit('fetch', view, (err, record) => {
      if (err) return callback(err);
      if (record == null) return callback(new Error('DEEP_FILTER_NOT_FOUND'));
      const ids = record instanceof Array ? record.map(r => r.id) : record.id;
      filters.push(helper.AST.FieldValueEquality(name, ids));
      return callback();
    });
  });

  node.on('fetch-build', function ({ plucks, filters, pagination }) {
    const link = this.node.get('link');
    const table = this.node.get('table');
    if (link == null || table == null)
      throw new Error('Collection have not been configured');
    const query = table.clone();
    query.select(helper.escapeFields(plucks, link));
    for (let i = 0; i < filters.length; i++) {
      const filter = helper.makeFilter(filters[i]);
      query.whereRaw(filter.condition, filter.values);
    }
    if (pagination.limit != null) query.limit(pagination.limit | 0);
    query.offset(pagination.offset | 0);
    return { query };
  });

  node.on('fetch-execute', function ({ query }, callback) {
    return query.asCallback((err, result) => {
      if (err) return callback(err);
      return callback(null, { result });
    });
  });

  node.on('fetch-children', function ({ plucks, result, children }, callback) {
    for (var firstChild in children) break ;
    if (firstChild == null) return callback(null, {});
    const childList = Object.keys(children);
    return async.each(result, (row, callback) => {
      return async.each(childList, (childName, callback) => {
        const field = this.node.field(childName);
        const view = Object.create(children[childName]);
        if (field.node.hasLayout('Collection')) {
          view.this = row.id;
          view.$limit = -1;
          plucks.push(childName);
        } else if (row[childName] != null) {
          view.id = row[childName];
          view.$limit = null;
          view.$offset = null;
          view.$order = null;
          view.$rand = null;
        } else {
          return callback();
        }
        return this.node.field(childName).node.emit('fetch', view, (err, result) => {
          if (err) return callback(err);
          row[childName] = result;
          return callback();
        });
      }, (e) => { callback(e) });
    }, err => {
      return callback(err, { result, plucks })
    });
  });

  node.on('fetch-format', function ({ request, plucks, children, pagination, result }) {
    const lines = [];
    if (result == null) result = [];
    if ('$pluck' in request) plucks = Object.keys(request.$pluck || {});
    for (let i = 0; i < result.length; i++) {
      const row = {};
      for (let ii = 0; ii < plucks.length; ii++)
        Yolo.Util.setIn(row, plucks[ii], result[i][plucks[ii]]);
      lines.push(row);
    }
    if (pagination.offset === 0 && pagination.limit === 1)
      return lines[0] || null;
    else
      return lines;
  });

  /***/

  node.on('upsert', new Bee()
          .extract({ request: 'jp:@' })
          .then(':upsert-prepare')
          .Each('dependencies', null, 'dependency')
          .  then(':upsert-dependency')
          .close()
          .then(':upsert-build')
          .then(':upsert-execute')
          .Each('collections', null, 'collection')
          .  then(':upsert-collection')
          .close()
          .pipe(':upsert-format')
          .end()
         );

  node.on('upsert-prepare', function ({ request }, callback) {
    const result = { record: {}, dependencies: [], collections: [] };
    const fields = this.node.field();
    return async.each(fields, (fieldName, callback) => {
      if (fieldName == 'id') return callback();
      const field = this.node.field(fieldName);
      const value = fieldName in request ? request[fieldName] : null;
      switch (field.node.kind()) {
      case 'Collection':
        result.collections.push({ type: field, name: fieldName });
        return callback();
      case 'Record':
        result.record[fieldName] = null;
        return field.node.emit('identify', value, (err, value) => {
          if (err) return callback(err);
          if (value != null && typeof value == 'object' && value.id != null)
            result.record[fieldName] = value.id;
          else
            result.dependencies.push({ type: field, name: fieldName });
          return callback();
        });
      case 'Primitive':
        result.record[fieldName] = value;
        return callback();
      default:
        return callback();
      }
    }, (err) => {
      return callback(err, result);
    });
  });

  node.on('upsert-dependency', function ({ request, dependency: { type, name } }, callback) {
    const payload = request[name];
    if (payload == null)
      return callback(null, { record: { [name]: null } });
    else
      return type.node.emit('upsert', payload, (err, result) => {
        if (err) return callback(err);
        return callback(null, { record: { [name]: result.id } });
      })
  });

  node.on('upsert-build', function (payload, callback) {
    if (payload.request.id != null) {
      return this.node.emit('update-build', payload, callback);
    } else {
      return this.node.emit('insert-build', payload, callback);
    }
  });

  node.on('upsert-execute', function ({ request, query }, callback) {
    return query.asCallback((err, result) => {
      if (err) return callback(err);
      const flow = { record: { id: request.id }, result };
      if (result[0] instanceof Object)
        if (result[0].insertId > 0)
          flow.record.id = result[0].insertId;
      return callback(null, flow);
    });
  });

  node.on('upsert-collection', function ({ record, request, collection: { type, name } }, callback) {
    return type.node.emit('delete', { this: record.id }, err => {
      if (err) return callback(err);
      const collection = request[name];
      if (collection == null) {
        return callback();
      } else if (collection instanceof Array) {
        for (let i = 0; i < collection.length; i++) {
          collection[i].id = null;
          collection[i].this = record.id;
        }
      } else if (collection instanceof Object) {
        for (const key in collection) {
          if (collection[key] == null) collection[key] = {};
          const content = collection[key];
          const hasList = content instanceof Array;
          if (hasList) {
            for (let ii = 0; ii < content.length; ii++) {
              content[ii].id = null;
              content[ii].this = record.id;
            }
          } else {
            collection[key].id = null;
            collection[key].this = record.id;
          }
        }
      } else {
        throw new Error('Unbale to set relation id');
      }
      return type.node.emit('upsert', request[name], (err, collection) => {
        if (err) return callback(err);
        return callback(null, { record: { [name]: collection } });
      });
    });
  });

  node.on('upsert-format', function ({ request, record, dependencies }) {
    const result = {};
    for (let fieldName in record) {
      Yolo.Util.setIn(result, fieldName, request[fieldName]);
      if (request[fieldName] == null)
        Yolo.Util.setIn(result, fieldName, record[fieldName]);
    }
    return result;
  });

  node.on('insert-build', function ({ request, record }) {
    const link = this.node.get('link');
    if (link == null) throw new Error('Collection have not been configured');
    const fields = [];
    const values = [];
    for (const fieldName in record) {
      fields.push(helper.escapeField(fieldName));
      values.push(record[fieldName]);
    }
    const q = [ 'INSERT INTO', helper.escapeField(this.node.get('mysql.table'))
              , '(', fields.join(', '), ')'
              , 'VALUES (', fields.map(e => '?').join(', '), ')'
              ];
    const query = link.raw(q.join(' '), values);
    return { query };
  });

  node.on('update-build', function ({ request, record }) {
    const link = this.node.get('link');
    if (link == null) throw new Error('Collection have not been configured');
    const fields = [];
    const values = [];
    for (const fieldName in record) {
      fields.push(helper.escapeField(fieldName) + ' = ?');
      values.push(record[fieldName]);
    }
    const q = [ 'UPDATE', helper.escapeField(this.node.get('mysql.table'))
              , 'SET', fields.join(', ')
              , 'WHERE `id` = ?'
              ];
    values.push(request.id);
    const query = link.raw(q.join(' '), values);
    return { query };
  });

  /***/

  node.on('delete', new Bee()
          .extract({ request: 'jp:@' })
          .then('delete-prepare')
          .Each('collections', null, 'collection')
          .  then(':delete-collection')
          .close()
          .then('delete-record')
          .end()
         );

  node.on('delete-prepare', function ({ request }) {
    debugger;
    return {};
  });

  node.on('delete-collection', function ({ collection }) {
    debugger;
  });

  node.on('delete-record', function (request, callback) {
    debugger;
    const link = this.node.get('link');
    const table = this.node.get('table');
    if (link == null || table == null)
      throw new Error('Collection have not been configured');
    return table.clone().where(request).del().asCallback(callback);
  });

};
