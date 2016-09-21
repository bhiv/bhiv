import knex from 'knex';

export default function (node, logger, Bee) {

  node.on('init', function (_, callback) {
    return callback();
  });

  node.on('get-link', function (name, callback) {
    const link = this.node.get('links.' + name);
    if (link != null) return callback(null, link);
    return this.node.send(':create-link', name, callback);
  });

  node.on('create-link', function (name, callback) {
    const config = this.node.get(name);
    const link = knex(config).on('query-error', (err, obj) => {
      const slot = '[' + name + ']';
      logger.error(slot, obj.sql);
      logger.error(slot, JSON.stringify(obj.bindings));
    });
    node.set('links.' + name, link);
    return callback(null, link);
  });

};