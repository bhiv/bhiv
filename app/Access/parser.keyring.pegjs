Main = f:Field v:Params? t:('.' Field Params?)* ':' m:Method {
  var result = [f];
  if (v != null) {
    for (var j = 0; j < v.length; j++)
      result.push(v[j]);
  }
  for (var i = 0; i < t.length; i++) {
    var field = t[i][1];
    var value = t[i][2];
    result.push(field);
    if (value != null) {
      for (var j = 0; j < value.length; j++)
        result.push(value[j]);
    }
  }
  result.push(m);
  return result;
}

Field = [A-Z]i+ {
  return { type: 'field', name: text() };
}

Params = '(' h:Param t:(',' Param)* ')' {
  var result = [h];
  for (var i = 0; i < t.length; i++)
    result.push(t[i][1]);
  return result;
}

Param = Variable / Value

Variable = '{' p:Path '}' {
  return { type: 'variable', name: p, values: null };
}

Path = letter+ ('.' letter+)* {
  return text();
}

Value = [^,)]+ {
  return { type: 'variable', name: '_inline', values: [text()] };
}

Method = letter+ ('-' letter+)* {
  return { type: 'method', name: text() };
}

letter = [a-z0-9]
