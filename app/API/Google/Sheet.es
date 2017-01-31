import path from 'path';
import fs from 'fs';
import googleAPI from 'googleapis';
import googleAuth from 'google-auth-library';

export default function (node, logger, Bee) {

  /*************************/

  node.on('-load', function (slice, callback) {
    if (this.node.get('credentials') == null) throw new Error('missing credentials');
    return this.super(slice, callback);
  });

  node.on('authorize', function ({ scopes }, callback) {
    const credentials = this.node.get('credentials');
    const clientSecret = credentials.installed.client_secret;
    const clientId = credentials.installed.client_id;
    const redirectUrl = credentials.installed.redirect_uris[0];
    const auth = new googleAuth();
    const client = new auth.OAuth2(clientId, clientSecret, redirectUrl);
    const savedAuth = this.node.get('auth');
    if (savedAuth != null) return callback(null, { auth: savedAuth });
    return this.node.emit('read-token', {}, (err, token) => {
      if (err == null) return this.node.emit('set-token', { client, token }, callback);
      const code = this.node.get('authorization_code');
      return this.node.emit('get-new-token', { client, scopes, code }, (err, token) => {
        if (err) return callback(err);
        return this.node.emit('store-token', token, (err) => {
          if (err) return callback(err);
          return this.node.emit('set-token', { client, token }, callback);
        });
      });
    });
  });

  node.on('set-token', function ({ client, token }) {
    client.credentials = token;
    node.set('auth', client);
    return { auth: client };
  });

  node.on('get-new-token', function ({ client, scopes, code }, callback) {
    if (code == null) {
      const authUrl = client.generateAuthUrl({ access_type: 'offline', scope: scopes });
      const message = [ 'Authorize this app by visiting this url: ' + authUrl
                      , 'and store it into ' + this.node.cwd() + '[authorization_code]'
                      ].join('\n');
      return callback(new Error(message));
    } else {
      return client.getToken(code, callback);
    }
  });

  node.on('store-token', function (token, callback) {
    return this.node.emit('get-token-path', {}, (err, path) => {
      if (err) return callback(err);
      const content = JSON.stringify(token);
      return fs.writeFile(path, content, err => callback(err));
    });
  });

  node.on('read-token', function ({}, callback) {
    return this.node.emit('get-token-path', {}, (err, path) => {
      if (err) return callback(err);
      return fs.readFile(path, (err, data) => {
        if (err) return callback(err);
        const token = JSON.parse(data.toString());
        return callback(null, token);
      });
    });
  });

  node.on('get-token-path', function ({}, callback) {
    let directory = this.node.get('token_directory');
    if (directory == null) {
      const home = process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
      if (home == null) return callack('No token directory defined');
      directory = path.join(home, '.credentials');
    }
    const filename = this.node.get('token_filename');
    if (filename == null) return callback('No token filename defined');
    return callback(null, path.join(directory, filename));
  });

  /*************************/

  node.on('get', new Bee()
          .then(':authorize', { scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] })
          .then(':get-unsafe')
          .end());
  node.on('get-unsafe', function (payload, callback) {
    return googleAPI.sheets('v4').spreadsheets.get(payload, callback);
  });

  node.on('get-values', new Bee()
          .then(':authorize', { scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] })
          .then(':get-values-unsafe')
          .end());
  node.on('get-values-unsafe', function (payload, callback) {
    return googleAPI.sheets('v4').spreadsheets.values.get(payload, callback);
  });
};
