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
    const link = knex(config);
    node.set('links.' + name, link);
    return callback(null, link);
  });

};