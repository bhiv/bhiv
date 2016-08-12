import path from 'path';
import { default as S } from 'string';

export default function (node, logger, Bee) {
  const cache = new Yolo.Cache();

  node.hub('model.layout');

  /*************************************/

  node.on('serve-http-read', new Bee()
          .then({ action: 'read' })
          .then('Access:extract-http-access')
          .then(':sanitize-model-layout', { layout: '${params.model}' }, { model: '${.}' })
          .then(':parse-http-filters', '${query}', { filters: '${.}' })
          .pipe(':should-proxy')
          .pipe({ type: 'json', content: '${.}' })
          .end()
         );

  node.on('serve-http-write', new Bee()
          .then({ action: 'write' })
          .then('Access:extract-http-access')
          .then(':sanitize-model-layout', { layout: '${params.model}' }, { model: '${.}' })
          .pipe(':should-proxy')
          .pipe({ type: 'json', content: '${.}' })
          .end()
         );

  node.on('serve-http-remove', new Bee()
          .then({ action: 'remove' })
          .then('Access:extract-http-access')
          .then(':sanitize-model-layout', { layout: '${params.model}' }, { model: '${.}' })
          .then(':parse-http-filters', '${query}', { filters: '${.}' })
          .pipe(':should-proxy')
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

  /****************************************/

  node.on('execute', function (payload, callback) {
    debugger;
    return payload.model.emit(payload.action, payload, callback);
  });

  node.on('read', new Bee()
          .then(':require-model', null, { model: '${.}' })
          .pipe(':execute')
          .Map('.', 'key', 'data')
          .  then(':sanitize', '${data}')
          .close({ max: 10 })
          .end()
         );

  node.on('write', new Bee()
          .then(':require-model', null, { model: '${.}' })
          .then(':sanitize', '${data}', { data: '${.}' })
          .pipe(':execute')
          .end()
         );

  node.on('remove', new Bee()
          .then(':require-model', null, { model: '${.}' })
          .pipe(':execute')
          .end()
         );


  /***********************************/

  node.on('sanitize', function (data, callback) {
    debugger;
  });

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

  node.on('should-proxy', function (payload, callback) {
    if (this.node.get('proxy') != null) {
      const params = { method: payload.action, model: payload.model, query: payload.query };
      return this.node.emit('proxy', params, (err, response) => {
        if (err) return flux(err);
        else return flux.emit('success', response);
      });
    } else {
      return this.node.emit(action, payload, callback);
    }
  });

  node.on('proxy', function (payload, callback) {
    const proxy = this.node.get('proxy');
    return this.node.send(proxy, payload, callback);
  });

};
