import knex from 'knex';
import util from 'util';
import clrs from 'colors/safe';

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
      logger.error(slot, colorize(obj.sql), JSON.stringify(obj.bindings));
    }).on('query', obj => {
      logger.debug(slot, colorize(obj.sql), JSON.stringify(obj.bindings));
    });
    node.set('links.' + name, link);
    return callback(null, link);
  });

  const rst = (function () {
    const rxp = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;
    return function (str) {
      rxp.lastIndex = 0;
      return str.replace(rxp, '');
    };
  })();

  const Clr = function (str) { this.s = str.replace(/\r?\n/g, ' '); };

  Clr.prototype.set = function (rxp, clr) {
    this.s = this.s.replace(rxp, txt => {
      const m = /^(\s*)(.+?)(\s*)$/.exec(txt);
      return m[1] + clrs[clr](rst(m[2])) + m[3];
    });
    return this;
  };

  const colorize = function (sql) {
    return new Clr(sql)
      .set(/select|insert|update|delete|create|drop/ig, 'blue')
      .set(/(distinct|set|into|left|right|join|on|union|values)\s/ig, 'yellow')
      .set(/(group|where|having|limit|order|by|asc|desc|and|or|between|in)\s|!?=/ig, 'cyan')
      .set(/\?/ig, 'red')
      .set(/`.+?`/ig, 'green')
      .s.replace(/(from)(.+?)(`.+?`(?:\s*\.\s*`.+?`)*)/ig, (_, key, space, source) => {
        return clrs.cyan(rst(key)) + space + clrs.magenta(rst(source));
      });
    ;
  };

};