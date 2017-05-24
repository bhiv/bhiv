/*!UroxGvT3uDMQCT1va20i43ZZSxo*/

import path from 'path';

export default function (node, logger) {

  node.on('get-file-as-string', function (filename, callback) {
    const filepath = path.join('resources', this.node.cwd().replace(/\./g, '/'), filename);
    return this.node.send('Util.Retriever:request', { filepath }, callback);
  });
};
