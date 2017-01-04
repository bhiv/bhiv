export default new function () {

  this.escapeFields = function (fields, link) {
    return fields.map(field => this.escapeField(field, link));
  };

  this.escapeField = function (field, link) {
    if (field.substr(0, 4) == 'sql:') {
      const value = field.substr(4);
      if (link != null) return link.raw(value);
      return value;
    } else {
      const value = '`' + field.replace(/`/g, '``') + '`';
      if (link != null) return link.raw(value);
      return value;
    }
  };

  this.makeFilter = function (ast, link) {
    const condition = [];
    const values = [];
    if (ast.type == 'comparison') {
      if (ast.operator != 'sql') {
        this.setFilterPart(ast.left, condition, values);
        condition.push(ast.operator);
        this.setFilterPart(ast.right, condition, values);
      } else {
        this.setFilterPart(ast.left, condition, values);
        condition.push(ast.right);
      }
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
      condition.push(ast.value instanceof Array ? '(?)' : '?');
      values.push(ast.value);
      break ;
    default :
      throw new Error('Unhandled filter part type: ' + ast.type);
    }
  };

  this.AST = new function () {
    this.FieldValueEquality = function (field, value) {
      if (typeof value == 'string' && value.substr(0, 4) == 'sql:') {
        return { type: 'comparison', operator: 'sql'
               , left: { type: 'field', name: field }
               , right: value.substr(4)
               };
      } else {
        return { type: 'comparison', operator: value instanceof Array ? 'in' : '='
               , left: { type: 'field', name: field }
               , right: { type: 'data', value: value }
               };
      }
    };
  };

};