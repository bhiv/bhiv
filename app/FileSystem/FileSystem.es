/*!UroxGvT3uDMQCT1va20i43ZZSxo*/
import path from 'path';
import fs   from 'fs';

export default function (node, logger) {

  node.on('get-absolute-filepath').memoize(10).then(function (filepath, callback) {
    if (filepath.indexOf('/') === 0) return callback(null, filepath);
    return (function loop(paths) {
      const fullpath = path.join(paths.shift(), filepath);
      return fs.stat(fullpath, (err, stat) => {
        if (err) {
          if (paths.length == 0) return callback(err);
          else return loop(paths);
        }
        return callback(null, fullpath)
      });
    })(toplevel.paths.slice());
  }).end();

};
