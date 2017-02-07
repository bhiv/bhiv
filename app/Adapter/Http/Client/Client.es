import { default as Http } from 'node-wrapper/http.js';
import * as Url from 'url';
import { default as Bhiv } from 'bhiv';

export default function (node, logger, Bee) {

  node.on('-load', function (slice, callback) {
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
    return this.super(slice, callback);
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
    if (request.url == null && request.base_url != null && request.path != null)
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
    const headers = Object.create(request.headers || {});
    if (request.authorization != null) {
      if (request.authorization.type == 'basic') {
        const user = request.authorization.user;
        const pass = request.authorization.password;
        const userpassb64 = new Buffer([user, pass].join(':')).toString('base64')
        headers.Authorization = 'Basic ' + userpassb64;
      } else if (request.authorization.type != null) {
        return callback(new Error('Only basic authorization, implemented'));
      }
    }
    for (const key in headers) {
      switch (key.toLowerCase()) {
      case 'content-type':
        http.setContentType(headers[key]);
      default:
        http.setHeader(key, headers[key]);
      }
    }
    if (request.data != null)
      http.setDataObject(request.data);

    if (callback.has('data')) {
      http.setOutput('emitter');
      return http.execute((err, emitter) => {
        emitter.on('head', head => callback.emit('head', head));
        emitter.on('data', data => callback.emit('data', data));
        emitter.on('end', () => callback(null, null));
        emitter.on('error', err => callback(err));
      });
    } else {
      if (typeof request.output == 'string')
        http.setOutput(request.output);
      http.setOutputType(request.fullresponse ? 'fullresponse' : 'bodyonly');
      return http.execute(callback);
    }
  });

};