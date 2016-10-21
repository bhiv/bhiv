export default function (node, logger) {

  node.kind('Primitive');

  node.set('regexp', /(https?|ftp):\/\/(-\.)?([^\s/?\.#-]+\.?)+(\/[^\s]*)?$/i);

  node.check('valid-url', function (url) {
    if (this.get('regexp').test(url))
      throw new Error('Is not a valid url');
  });

  node.patch('from-resource', function (resource, callback) {
    if (!(typeof resource == 'object') || resource == null) return callback(null, resource);
    if (!('scheme' in resource && 'data' in resource)) return callback(null, resource);
    return callback(null, resource.scheme + resource.data);
  });

};
