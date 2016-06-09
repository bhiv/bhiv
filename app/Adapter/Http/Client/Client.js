var Http   = require('node-wrapper/http.js');
var Url    = require('url');

module.exports = function (node) {

  node.on('request', function (request, event) {
    if (request.url) {
      var urlp = Url.parse(request.url, true);
      var parts = { protocol: urlp.protocol, host: urlp.host
                  , pathname: urlp.pathname, query: urlp.query
                  };
      Yolo.Util.merge(request, parts);
    }
    var http = new Http(Url.format(request));
    http.setMethod((request.method || 'get').toUpperCase());
    for (var key in request.headers) {
      switch (key.toLowerCase()) {
      case 'content-type':
        http.setContentType(request.headers[key]);
      default:
        http.setHeader(key, request.headers[key]);
      }
    }
    if (request.data != null)
      http.setDataObject(request.data);
    return http.execute(event.createCallback());
  });

  return node;
};