import detectSeries from 'async/detectSeries';
import KeyRing from './parser.keyring.pegjs';
import KeyHole from './parser.keyhole.pegjs'

export default function (node, logger, Bee) {

  node.on('extract-http-access', 'prepare', function (payload, callback) {
    const access = {};
    if (payload.params.access_token != null)
      access.token = payload.params.access_token;
    return callback(null, { access });
  });

  node.on('when-granted', function ({ scopes, rights }, callback) {
    if (scopes == null) return callback('Scopes is missing');
    if (rights == null) return callback('No right given');
    logger.debug(scopes, rights);
    return this.node.send(':create-keyring', rights, (err, keyring) => {
      if (err) return callback(err);
      return this.node.send(':open-one-keyhole', { keyholes: scopes, keyring }, (err) => {
        if (err) return callback('Permission denied');
        return callback();
      });
    });
  });

  node.on('create-keyring', function ({ patterns, properties }, callback) {
    const tree = {};
    iter: for (let i = 0; i < patterns.length; i++) {
      let node = tree;
      const parts = KeyRing.parse(patterns[i]);
      for (let ii = 0; ii < parts.length; ii++) {
        const part = parts[ii];
        kind: switch (part.type) {
        case 'field':
          if (node.fields == null) node.fields = {};
          if (node.fields[part.name] == null) node.fields[part.name] = {};
          node = node.fields[part.name];
          break kind;
        case 'variable':
          if (node.variables == null) node.variables = {};
          if (part.values == null) part.values = properties[part.name] || [];
          const variable = node.variables[part.name] || { values: {}, next: {} };
          node.variables[part.name] = variable;
          for (var iii = 0; iii < part.values.length; iii++)
            variable.values[part.values[iii]] = true;
          node = variable.next;
          break kind;
        case 'method':
          if (node.methods == null) node.methods = {};
          node.methods[part.name] = true;
          continue iter;
        }
      }
    }
    return callback(null, tree);
  });

  node.on('open-keyhole', function ({ keyring, keyhole }, callback) {
    if (typeof keyhole == 'string') {
      try { keyhole = KeyHole.parse(keyhole); }
      catch (e) { return callback('Can not parse keyhole'); }
    }

    const unlocked = (function turn(keyring, keyhole) {
      const pin = keyhole[0];
      if (pin == null) return false;
      switch (pin.type) {
      case 'field':
        if (keyring.fields == null) return false;
        if (keyring.fields[pin.name] == null) return false;
        return turn(keyring.fields[pin.name], keyhole.slice(1));
      case 'value':
        if (keyring.variables == null) return false;
        for (var set in keyring.variables)
          if (keyring.variables[set].values[pin.value] === true)
            if (turn(keyring.variables[set].next, keyhole.slice(1)))
              return true;
        return false;
      case 'method':
        if (keyring.methods == null) return false;
        if (!keyring.methods[pin.name]) return false;
        return true;
      default :
        return false;
      }
    })(keyring, keyhole);

    if (unlocked === true) return callback();
    else return callback('Can not open keyhole');
  });

  node.on('open-one-keyhole', function ({ keyring, keyholes }, callback) {
    return detectSeries(keyholes, (keyhole, callback) => {
      return this.node.send(':open-keyhole', { keyring, keyhole }, (err) => {
        if (err) return callback(null, false);
        return callback(null, true);
      });
    }, (err, keyhole) => {
      if (err) return callback(err);
      else if (keyhole == null) return callback('Permission denied');
      return callback();
    });
  });

};
