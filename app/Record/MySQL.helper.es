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
      switch (ast.operator) {
      default:
        this.setFilterPart(ast.left, condition, values);
        condition.push(ast.operator);
        this.setFilterPart(ast.right, condition, values);
        break ;
      case 'sql':
        this.setFilterPart(ast.left, condition, values);
        condition.push(ast.right);
        break ;
      case 'sql-fragment':
        const field = this.escapeField(ast.field);
        condition.push(ast.fragment.replace(/@/g, field));
        Array.prototype.push.apply(values, ast.values);
        break ;
      }
    } else if (ast.type == 'fulltext-search') {
      condition.push('match');
      this.setFilterPart(ast.source, condition);
      condition.push('against(');
      const field = { type: 'data', value: ast.value };
      this.setFilterPart(field, condition, values);
      if (ast.bool) condition.push('in boolean mode');
      condition.push(')');
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
      if (ast.value instanceof Array) {
        if (ast.value.length > 0) {
          condition.push('(?)');
          values.push(ast.value);
        } else {
          condition.push('(NULL)');
        }
      } else {
        condition.push('?');
        values.push(ast.value);
      }
      break ;
    default :
      throw new Error('Unhandled filter part type: ' + ast.type);
    }
  };

  this.AST = new function () {
    this.FieldValueRaw = function (field, value) {
      return { type: 'comparison', operator: 'sql-fragment'
             , field, fragment: value.$sql.filter, values: value.$sql.values
             };
    };

    this.FieldValueComparison = function (field, value) {
      const type = typeof value;
      if (type == 'string' && value.substr(0, 4) == 'sql:') {
        return { type: 'comparison', operator: 'sql'
               , left: { type: 'field', name: field }
               , right: value.substr(4)
               };
      } else if (value instanceof Array) {
        return { type: 'comparison', operator: 'in'
               , left: { type: 'field', name: field }
               , right: { type: 'data', value }
               };
      } else {
        return { type: 'comparison', operator: '='
               , left: { type: 'field', name: field }
               , right: { type: 'data', value }
               };
      }
    };

    this.FieldValueFullText = function (field, value) {
      return { type: 'fulltext-search'
             , source: { type: 'field', name: field }
             , value: value.$ft
             , bool: value.$bool === false ? false : true
             };
    };
  };

};