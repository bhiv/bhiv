import knex from 'knex';

export default function (node, logger, Bee) {

  node.on('get-link', function (name, callback) {
    const link = this.node.get('links.' + name);
    if (link != null) return callback(null, link);
    return this.node.send(':create-link', name, callback);
  });

  node.on('create-link', function (name, callback) {
    const slot = '[' + name + ']';
    const config = this.node.get(name);
    if (Yolo.Util.getIn(config, 'connection.user') == null)
      return callback(new Error(slot + ' Missing Knex config connection user'));
    logger.debug(slot, 'config =>', config);
    const link = knex(config).on('query-error', (err, obj) => {
      logger.error(slot, obj.sql, JSON.stringify(obj.bindings));
    }).on('query', obj => {
      logger.debug(slot, obj.sql, JSON.stringify(obj.bindings));
    });
    node.set('links.' + name, link);
    return callback(null, link);
  });

};