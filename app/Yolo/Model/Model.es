import path from 'path';
import { default as Bhiv } from 'bhiv';
import { default as S } from 'string';

export default function (node) {
  const Bee   = new Bhiv(node.createInvoke(), node.data).Bee;
  const cache = new Yolo.Cache();

  node.hub('model.layout');

  node.on('serve-http-list', 'in', new Bee()
          .then(':parse-http-filters', '${query}', { filters: '${.}' })
          .pipe(':list', { model: '${params.model}', filters: '${filters}' })
          .pipe({ type: 'json', content: '${.}' })
          .end()
         );

  const file = path.join(__dirname, 'filters-parser.pegjs');
  node.on('http-parse-filters', function ({ filters }, event) {
    if (filters == null) return event.reply(null, {});
    return this.node.send('Language.Peg:parse-value-from-peg-file', { file, value: filters }, event);
  });

  node.on('require-model', function (model, event) {
    model = model.split('.').map(section => S(section).camelize().capitalize().s).join('.');
    return this.node.create(model, model, function (err, result) {
      if (err) return event.reply(err);
      return event.reply(null, result.leaf);
    });
  });

  node.on('list', function ({ model: name, filters }, event) {
    return this.node.emit('require-model', name, (err, model) => {
      if (err) return event.reply(err);
      return model.emit('list', { filters }, event);
    });
  });

};
