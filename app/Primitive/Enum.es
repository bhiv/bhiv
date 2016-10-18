export default function (node, logger) {

  node.kind('Primitive');

  const data = this.args[0];
  logger.notice('can not retrieve', data);
  node.check('is-one-of', function (value) {
    debugger ;
  });

};
