/*!UroxGvT3uDMQCT1va20i43ZZSxo*/
export default function (node, logger) {

  node.kind('Record');

  const storage = typeof localStorage != 'undefined' ? localStorage : null;

  node.on('fetch', function (view, callback) {
    if (storage == null) return callback('No storage available');
    const prefix = this.node.get('storage.prefix');
    const paths = [];
    Bhiv.Util.walk(view, function (path, value) {
      if (path.length == 0) return value;
      paths.push(path.join('.'));
      return value;
    });
    const result = {};
    paths.map(function (path) {
      const value = storage.getItem(prefix + '.' + path);
      Bhiv.Util.setIn(result, path, value);
    });
    return callback(null, result);
  });

  node.on('pull').as({ query: '$:@' })
    .then(':fetch', '$:query').merge('result')
    .then(function ({ query, result }) {
      Bhiv.Util.walk(query, (path, value) => {
        if (path.length == 0) return value;
        if (value && typeof value == 'object') {
          for (var has in value) break ;
          if (has) return value;
        }
        const target = path.join('.');
        const data = Bhiv.Util.getIn(result, target);
        this.node.set(target, data);
        return null;
      });
      return result;
    })
    .end();

};
