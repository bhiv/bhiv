import path from 'path';
import { default as Bhiv } from 'bhiv';
import { default as S } from 'string';

export default function (node) {
  const Bee   = new Bhiv(node.createInvoke(), node.data).Bee;
  const cache = new Yolo.Cache();

  node.on('http-serve-list', 'in', new Bee()
          .then(':parse-http-filters', '${query}', { filters: '${.}' })
          .then(':require-model', '${params.model}', { model: '${.}' })
          .pipe(':model-list', { model: '${model}', filters: '${filters}' })
          .pipe({ type: 'json', content: '${.}' })
          .end()
         );

  const file = path.join(__dirname, 'filters-parser.pegjs');
  node.on('parse-http-filters', ({ filters }, event) => {
    if (filters == null) return event.reply(null, {});
    return node.send('Language.Peg:parse-value-from-peg-file', { file: file, value: filters }, event);
  });

  node.on('require-model', (model, event) => {
    model = model.split('.').map(section => S(section).camelize().capitalize().s).join('.');
    return node.create(model, model, function (err, result) {
      if (err) return event.reply(err);
      return event.reply(null, result.leaf);
    });
  });

  node.on('model-list', (request, event) => {
    return request.model.emit('list', request, event);
  });

};
