import { default as Http } from 'node-wrapper/http.js';
import * as Url from 'url';
import { default as Bhiv } from 'bhiv';

export default function (node, logger, Bee) {

  node.on('-load', function ({}, callback) {
    const templates = this.node.get('templates');
    if (templates != null) {
      for (const method in templates) {
        const template = templates[method];
        if (template.base_url == null) template.base_url = this.node.get('base_url');
        if (template.fullresponse == null) template.fullresponse = this.node.get('fullresponse');
        node.on(method, ((template) => (payload, callback) => {
          this.node.emit('request-template', { template, payload }, callback);
        })(template));
      }
    }
    return callback();
  });

  node.on('request-template', function ({ template, payload }, callback) {
    const request = Object.assign({}, template);
    request.path = (request.path || '/').replace(/\$\{([^\}]+)\}/g, ({}, key) => {
      let value = Yolo.Util.getIn(payload, key);
      if (typeof value != 'string') value = JSON.stringify(value);
      return encodeURIComponent(value);
    });
    request.data = Bhiv.extract(request.data, payload);
    return this.node.emit('request', request, callback);
  });

  node.on('request', function (request, callback) {
    if (request.url == null && request.base_url != null  && request.path != null)
      request.url = request.base_url + request.path;
    if (request.url) {
      const urlp = Url.parse(request.url, true);
      const parts = { protocol: urlp.protocol, host: urlp.host
                  , pathname: urlp.pathname, query: urlp.query
                  };
      Yolo.Util.merge(request, parts);
    }
    const http = new Http(Url.format(request));
    http.setMethod((request.method || 'get').toUpperCase());
    for (const key in request.headers) {
      switch (key.toLowerCase()) {
      case 'content-type':
        http.setContentType(request.headers[key]);
      default:
        http.setHeader(key, request.headers[key]);
      }
    }
    if (request.data != null)
      http.setDataObject(request.data);
    http.setOutputType(request.fullresponse ? 'fullresponse' : 'bodyonly');
    return http.execute(callback);
  });

};