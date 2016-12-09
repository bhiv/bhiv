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
    const result = { fields: [], children: {} };
    if (request['*']) {
      const fields = this.node.field();
      for (let i = 0; i < fields.length; i++) {
        const fieldName = fields[i];
        if (fieldName in request) continue ;
        request[fieldName] = { '*': true };
      }
    }
    for (const fieldName in request) {
      if (fieldName == '*' || fieldName.substr(0, 1) == '$') continue ;
      const field = this.node.field(fieldName);
      if (field == null) {
        logger.warn(this.node.layout, 'Unknown field: ' + fieldName + ' has been requested');
      } else {
        if (field.node.hasLayout('Collection')) {
          const child = Yolo.Util.getIn(request, fieldName) || {};
          child['*'] = true;
          result.children[fieldName] = child;
        } else if (field.node.hasLayout('Record')) {
          result.fields.push(fieldName);
          const child = Yolo.Util.getIn(request, fieldName) || {};
          child['*'] = true;
          result.children[fieldName] = child;
        } else {
          result.fields.push(fieldName);
        }
      }
    }
    return result;
  });

  node.on('fetch-prepare-filters', function ({ request, fields, children }) {
    const result = { filters: [], unknowns: [] };
    for (let i = 0; i < fields.length; i++) {
      const fieldName = fields[i];
      const value = Yolo.Util.getIn(request, fieldName);
      if (value == null || typeof value == 'object') continue ;
      const kind = this.node.field(fieldName).node.kind();
      switch (kind) {
      case 'Primitive':
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
    view.id = null;
    return this.node.field(name).node.emit('fetch', view, (err, record) => {
      if (err) return callback(err);
      if (record == null) { debugger; return callback(new Error('DEEP_FILTER_NOT_FOUND')); }
      filters.push(helper.AST.FieldValueEquality(name, record.id));
      return callback();
    });
  });

  node.on('fetch-build', function ({ fields, filters, pagination }) {
    const result = { query: null };
    const link = this.node.get('link');
    const table = this.node.get('table');
    if (link == null || table == null)
      throw new Error('Collection have not been configured');
    const query = table.clone();
    query.select(helper.escapeFields(fields, link));
    for (let i = 0; i < filters.length; i++) {
      const filter = helper.makeFilter(filters[i]);
      query.whereRaw(filter.condition, filter.values);
    }
    if (pagination.limit != null) query.limit(pagination.limit);
    query.offset(pagination.offset);
    result.query = query;
    return result;
  });

  node.on('fetch-execute', function ({ query }, callback) {
    return query.asCallback((err, result) => {
      if (err) return callback(err);
      return callback(null, { result });
    });
  });

  node.on('fetch-children', function ({ result, children }, callback) {
    for (var firstChild in children) break ;
    if (firstChild == null) return callback(null, {});
    const childList = Object.keys(children);
    return async.each(result, (row, callback) => {
      return async.each(childList, (childName, callback) => {
        const field = this.node.field(childName);
        const view = children[childName];
        if (field.node.hasLayout('Collection')) {
          view.this = row.id;
          view.$limit = -1;
        } else {
          view.id = row[childName];
        }
        return this.node.field(childName).node.emit('fetch', view, (err, result) => {
          if (err) return callback(err);
          row[childName] = result;
          return callback();
        });
      }, callback);
    }, err => {
      return callback(err, { result })
    });
  });

  node.on('fetch-format', function ({ fields, pagination, result }) {
    const lines = [];
    if (result == null) result = [];
    for (let i = 0; i < result.length; i++) {
      const row = {};
      for (let ii = 0; ii < fields.length; ii++)
        Yolo.Util.setIn(row, fields[ii], result[i][fields[ii]]);
      lines.push(row);
    }
    if (pagination.offset === 0 && pagination.limit === 1)
      return lines[0] || null;
    else
      return lines;
  });

  node.on('upsert', new Bee()
          .extract({ request: 'jp:@' })
          .then(':upsert-prepare')
          .Each('dependencies', null, 'dependency')
          .  then(':upsert-dependency')
          .close()
          .then(':upsert-build')
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
      if (!(fieldName in request)) return callback();
      if (fieldName == 'id') return callback();
      const field = this.node.field(fieldName);
      const value = request[fieldName];
      switch (field.node.kind()) {
      case 'Collection':
        result.collections.push({ type: field, name: fieldName });
        return callback();
      case 'Record':
        return this.node.emit('identity', value, (err, value) => {
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
      }
    }, (err) => {
      return callback(err, result);
    });
  });

  node.on('upsert-dependency', function ({ request, dependency: { type, name } }, callback) {
    return type.node.emit(':upsert', request[name], (err, result) => {
      if (err) return callback(err);
      return callback(null, { record: { [name]: result.id } });
    })
  });

  node.on('upsert-build', function ({ request, record }) {
    const result = { query: null };
    const link = this.node.get('link');
    const table = this.node.get('table');
    if (link == null || table == null)
      throw new Error('Collection have not been configured');
    const query = table.clone();
    if (request.id != null) {
      query.where({ id: request.id }).update(record);
    } else {
      query.insert(record);
    }
    return { query };
  });

  node.on('upsert-execute', function ({ request, query }, callback) {
    return query.asCallback((err, result) => {
      if (err) return callback(err);
      const flow = { request: {}, result };
      if (request.id == null)
        flow.request.id = result[0];
      return callback(null, flow);
    });
  });

  node.on('upsert-collection', function ({ request, collection: { type, name } }, callback) {
    return async.map(request[name], (entry, callback) => {
      entry.this = request.id;
      return type.node.emit('upsert', entry, callback);
    }, (err, collection) => {
      return callback(err, { record: { [name]: collection } });
    });
  });

  node.on('upsert-format', function (record) {
    const result = {};
    for (let fieldName in record)
      Yolo.Util.setIn(result, fieldName, record[fieldName]);
    return result;
  });

};