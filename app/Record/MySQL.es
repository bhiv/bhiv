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

  node.on('identity-of', 'format', function (value) {
    if (value == null) return null;
    if (parseInt(value, 10) === value) return value;
    if (value.id > 0) return value.id;
    return value;
  });

  node.on('fetch', new Bee()
          .extract({ request: 'jp:@' })
          .then(':fetch-prepare-range')
          .then(':fetch-prepare-fields')
          .then(':fetch-prepare-filters')
          .trap('DEEP_FILTER_NOT_FOUND', ':fetch-format')
          .Each('unknowns', null, 'subrequest')
          .  then(':fetch-prepare-unknowns-filters')
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
    const fields = this.node.field();
    if (request['*']) {
      for (let i = 0; i < fields.length; i++) {
        const fieldName = fields[i];
        const field = this.node.field(fieldName);
        if (field.node.hasLayout('Collection')) {
          const child = Yolo.Util.getIn(request, fieldName) || {};
          child['*'] = true;
          result.children[fieldName] = child;
        } else {
          result.fields.push(fieldName);
        }
      }
    } else {
      for (const fieldName in request) {
        const field = this.node.field(fieldName);
        if (field == null) {
          debugger;
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
      if (value == null) continue ;
      const kind = this.node.field(fieldName).node.kind();
      switch (kind) {
      case 'Primitive':
        const filter = { type: 'comparison', operator: '='
                       , left: { type: 'field', name: fieldName }
                       , right: { type: 'data', value }
                       };
        result.filters.push(filter);
        break ;
      case 'Record':
        if (value.id > 0) {
          const filter = { type: 'comparison', operator: '='
                         , left: { type: 'field', name: fieldName }
                         , right: { type: 'data', value: value.id }
                         };
          result.filters.push(filter);
        } else {
          result.unknowns.push({ name: fieldName, view: value });
        }
        break ;
      case 'Collection':
        debugger;
        break ;
      }
    }
    for (const fieldName in children) {
      const collection = children[fieldName];
      const criterias = Object.keys(collection);
      if (criterias.length == 1 && collection['*']) continue ;
      debugger;
    }
    return result;
  });

  node.on('fetch-prepare-unknowns-filters', function (payload, callback) {
    const { filters, subrequest: { name, view } } = payload;
    view.id = null;
    return this.node.field(name).node.emit('fetch', view, (err, record) => {
      if (err) return callback(err);
      if (record == null) return callback('DEEP_FILTER_NOT_FOUND');
      filters.push( { type: 'comparison', operator: '='
                    , left: { type: 'field', name }
                    , right: { type: 'data', value: record.id }
                    }
                  );
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
        const view = children[childName];
        view.this = row.id;
        view.$limit = -1;
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

};