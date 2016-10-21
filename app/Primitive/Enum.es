export default function (node, logger) {

  node.kind('Primitive');

  const data = this.args[0];

  logger.warn('TODO: can not retrieve', data);

  node.check('is-one-of', function (value) {
    logger.notice('can not check', value);
  });

};
