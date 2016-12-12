export default function (node, logger) {

  node.kind('Primitive');

  node.set('regexp', /(https?|ftp):\/\/(-\.)?([^\s/?\.#-]+\.?)+(\/[^\s]*)?$/i);

  node.check('valid-url', function (url) {
    if (!this.get('regexp').test(url))
      throw new Error('Is not a valid url');
  });

  node.patch('from-resource', function (resource) {
    if (!(typeof resource == 'object') || resource == null) return null;
    if (!('scheme' in resource && 'data' in resource)) return null;
    return resource.scheme + resource.data;
  });

};
