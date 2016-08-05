import path from 'path';
import { default as S } from 'string';

export default function (node, logger, Bee) {
  const cache = new Yolo.Cache();

  node.hub('model.layout');

  node.on('serve-http-list', new Bee()
          .then('Access:extract-http-access')
          .then(':sanitize-model-layout', { layout: '${params.model}' }, { model: '${.}' })
          .then(':parse-http-filters', '${query}', { filters: '${.}' })
          .pipe(':list')
          .pipe({ type: 'json', content: '${.}' })
          .end()
         );

  node.on('http-parse-filters', (function () {
    const file = path.join(__dirname, 'filters-parser.pegjs');
    return function ({ filters }, callback) {
      if (filters == null) return callback(null, {});
      const payload = { file, value: filters };
      return this.node.send('Language.Peg:parse-value-from-peg-file', payload, callback);
    };
  })());

  node.on('sanitize-model-layout', function (model, callback) {
    const layout = model.layout.split('.').map(section => {
      return S(section).camelize().capitalize().s
    }).join('.');
    return callback(null, { layout });
  });

  node.on('require-model', function (model, callback) {
    if (model instanceof Yolo.Node) return callback(null, model);
    return this.node.create(model.layout, model.layout, (err, result) => {
      if (err) return callback(err);
      return callback(null, result.leaf);
    });
  });

  node.on('list', function ({ model, filters, access }, callback) {
    const query = { model, filters, access };
    if (this.node.get('proxy') != null) {
      return this.node.emit('proxy', { method: 'list', model, query }, (err, response) => {
        if (err) return callback(err);
        else return callback('return', response);
      });
    } else {
      return this.node.emit('require-model', model, (err, model) => {
        if (err) return callback(err);
        return model.emit('list', { access, filters }, callback);
      });
    }
  });

  node.on('proxy', function (payload, callback) {
    const proxy = this.node.get('proxy');
    return this.node.send(proxy, payload, callback);
  });

};
