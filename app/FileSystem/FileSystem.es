/*!UroxGvT3uDMQCT1va20i43ZZSxo*/
import path from 'path';
import fs   from 'fs';

export default function (node, logger) {

  node.on('get-absolute-filepath').memoize(10000).then(function (filepath, callback) {
    if (typeof filepath != 'string') return callback(new Error('Bad filepath argument'));
    if (filepath.indexOf('/') === 0) return callback(null, filepath);
    return (function loop(paths) {
      const fullpath = path.join(paths.shift(), filepath);
      return fs.stat(fullpath, (err, stat) => {
        if (err) {
          logger.debug('Stat file %s failed', fullpath);
          if (paths.length == 0) return callback(err);
          else return loop(paths);
        } else {
          logger.debug('Stat file %s found', fullpath);
          return callback(null, fullpath)
        }
      });
    })(toplevel.paths.slice());
  }).end();

};
