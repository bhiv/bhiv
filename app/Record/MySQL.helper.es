export default new function () {

  this.escapeFields = function (fields, link) {
    return fields.map(field => this.escapeField(field, link));
  };

  this.escapeField = function (field, link) {
    const value = '`' + field.replace(/`/g, '``') + '`';
    if (link != null) return link.raw(value);
    return value;
  };

  this.makeFilter = function (ast, link) {
    const condition = [];
    const values = [];
    if (ast.type == 'comparison') {
      this.setFilterPart(ast.left, condition, values);
      condition.push(ast.operator);
      this.setFilterPart(ast.right, condition, values);
    } else {
      throw new Error('Unhandled filter type: ' + ast.type);
    }
    if (link == null) return { condition: condition.join(' '), values };
    return { condition: link.raw(condition.join(' ')), values };
  };

  this.setFilterPart = function (ast, condition, values) {
    switch (ast.type) {
    case 'field':
      condition.push(this.escapeField(ast.name));
      break ;
    case 'data':
      condition.push('?');
      values.push(ast.value);
      break ;
    default :
      throw new Error('Unhandled filter part type: ' + ast.type);
    }
  };

};