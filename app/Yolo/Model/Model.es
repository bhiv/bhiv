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

  const file = path.join(__dirname, 'filters-parser.pegjs');
  node.on('http-parse-filters', function ({ filters }, event) {
    if (filters == null) return event.reply(null, {});
    return this.node.send('Language.Peg:parse-value-from-peg-file', { file, value: filters }, event);
  });

  node.on('sanitize-model-layout', function (model, event) {
    const layout = model.layout.split('.').map(section => {
      return S(section).camelize().capitalize().s
    }).join('.');
    return event.reply(null, { layout });
  });

  node.on('require-model', function (model, event) {
    if (model instanceof Yolo.Node) return event.reply(null, model);
    return this.node.create(model.layout, model.layout, function (err, result) {
      if (err) return event.reply(err);
      return event.reply(null, result.leaf);
    });
  });

  node.on('list', function ({ model, filters, access }, event) {
    const query = { model, filters, access };
    if (this.node.get('proxy') != null) {
      return this.node.emit('proxy', { method: 'list', model, query }, (err, response) => {
        debugger;
        if (err) return event.reply(err);
        else return event.reply('return', response);
      });
    } else {
      return this.node.emit('require-model', model, (err, model) => {
        if (err) return event.reply(err);
        return model.emit('list', { access, filters }, event);
      });
    }
  });

  node.on('proxy', function (payload, event) {
    const proxy = this.node.get('proxy');
    return this.node.send(proxy, payload, event);
  });

};
