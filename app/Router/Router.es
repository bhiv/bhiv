/*!UroxGvT3uDMQCT1va20i43ZZSxo*/
import Parser from './Router.parser.pegjs';

export default function (node, logger) {

  node.on('-start')
    .as({ node: '$:@' })
    .then(function (flow) { return this.node.get('routes'); }).merge('routes')
    .Map('routes')
    .  then(':route-map-add', '$:value')
    .  end()
    .end();

  node.on('route-map-add')
    .as({ filepath: '$:@' })
    .then('Util.Retriever:request', '$:filepath').merge('raw')
    .then(':parse', '$:raw').merge('rules')
    .Map('rules')
    .  then(':rule-add', '$:value')
    .  end()
    .end();

  node.on('parse', function (content, callback) {
    try { var rules = Parser.parse(content); }
    catch (e) { debugger; return callback(Yolo.Util.wrapError(e, content)); }
    return callback(null, rules);
  });

  node.on('rule-add', function (rule, callback) {
    if (rule.id == null) rule.id = Yolo.Digest(rule).substr(0, 8);
    return this.node.send(rule.fqn, rule, callback);
  });

};

