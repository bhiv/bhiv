var nmh    = require('node-mocks-http');
var URL    = require('url');

module.exports = function (node, logger, Bee) {

  node.on('handle-fetch-http', function (data, event) {
    var method = data.method || 'get';
    var url = URL.format(
      { protocol: 'http:'
      , hostname: data.config.ip || 'localhost'
      , port: data.config.port || 80
      , pathname: data.path || '/'
      }
    );
    var request = nmh.createRequest({ method: method, url: url });
    var response = nmh.createResponse();
    // fix nmh
    if (request.connection == null) request.connection = { encrypted: false };
    if (response._headers == null) response._headers = {};
    if (response._headerNames == null) response._headerNames = {};
    if (response._removedHeader == null) response._removedHeader = {};
    //
    return node.send('Routing.Http:get-server', data, function (err, server) {
      server.handle(request, response);
      return event.reply();
    });
  });

  node.on('handle-fetch-view', new Bee()
          .Map('views', null, 'view')
          .  pipe('Yolo.NSB:get', '${view}')
          .close()
          .end()
         );

};
