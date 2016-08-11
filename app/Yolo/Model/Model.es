import path from 'path';
import { default as S } from 'string';

export default function (node, logger, Bee) {
  const cache = new Yolo.Cache();

  node.hub('model.layout');

  node.on('serve-http-read', new Bee()
          .then('Access:extract-http-access')
          .then(':sanitize-model-layout', { layout: '${params.model}' }, { model: '${.}' })
          .then(':parse-http-filters', '${query}', { filters: '${.}' })
          .pipe(':read')
          .pipe({ type: 'json', content: '${.}' })
          .end()
         );
/*
  node.on('serve-http-write', new Bee()
          .then('Access:extract-http-access')
          .then(':sanitize-model-layout', { layout: '${params.model}' }, { model: '${.}' })
          .then(':parse-http-filters', '${query}', { filters: '${.}' })
          .pipe(':read')
          .pipe({ type: 'json', content: '${.}' })
          .end()
         );

  node.on('serve-http-remove', new Bee()
          .then('Access:extract-http-access')
          .then(':sanitize-model-layout', { layout: '${params.model}' }, { model: '${.}' })
          .then(':parse-http-filters', '${query}', { filters: '${.}' })
          .pipe(':read')
          .pipe({ type: 'json', content: '${.}' })
          .end()
         );
*/
  node.on('http-parse-filters', (function () {
    const file = path.join(__dirname, 'filters-parser.pegjs');
    return function ({ filters }, callback) {
      if (filters == null) return callback(null, {});
      const payload = { file, value: filters };
      return this.node.send('Language.Peg:parse-value-from-peg-file', payload, callback);
    };
  })());

  /***********************************/

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

  node.on('proxy', function (payload, callback) {
    const proxy = this.node.get('proxy');
    return this.node.send(proxy, payload, callback);
  });

  node.on('read', function ({ model, access, filters }, flux) {
    const query = { model, access, filters };
    if (this.node.get('proxy') != null) {
      return this.node.emit('proxy', { method: 'read', model, query }, (err, response) => {
        if (err) return flux(err);
        else return flux.emit('success', response);
      });
    } else {
      return this.node.emit('require-model', model, (err, model) => {
        if (err) return flux(err);
        return model.emit('read', { access, filters }, flux);
      });
    }
  });

  node.on('write', function ({ model, access, data }, flux) {
    const query = { model, access, data };
    if (this.node.get('proxy') != null) {
      return this.node.emit('proxy', { method: 'write', model, query }, (err, response) => {
        if (err) return flux(err);
        else return flux.emit('success', response);
      });
    } else {
      return this.node.emit('require-model', model, (err, model) => {
        if (err) return flux(err);
        return model.emit('write', { access }, flux);
      });
    }
  });

  node.on('remove', function ({ model, access, filters }, flux) {
    const query = { model, access, filters };
    if (this.node.get('proxy') != null) {
      return this.node.emit('proxy', { method: 'remove', model, query }, (err, response) => {
        if (err) return flux(err);
        else return flux.emit('success', response);
      });
    } else {
      return this.node.emit('require-model', model, (err, model) => {
        if (err) return flux(err);
        return model.emit('remove', { access, filters }, flux);
      });
    }
  });


};
