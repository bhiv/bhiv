export default function (node) {

  node.on('proxy', function (payload, event) {
    const proxy = this.node.get('proxy');
    return this.node.send(proxy, payload, event);
  });

  node.on('list', function (query, event) {
    const layout = this.node.layout;
    if (this.node.get('proxy') != null)
      return this.node.emit('proxy', { method: 'list', model: { layout }, query }, event);

    throw new Error('Not yet implemented');
  });

};
