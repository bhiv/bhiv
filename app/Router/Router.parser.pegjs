Routes = t:Line+ {
  var result = [];
  for (var i = 0; i < t.length; i++)
    if (t[i] != null)
      result.push(t[i]);
  return result;
}

space = [ \r\t\v\uFEFF]
wsnl  = space*
ws    = [ \r\t\v\uFEFF\n]*
hex   = [0-9a-fA-F]
digit = [0-9]
eof   = !.

Line = Rule / Comment

Comment = space+ { return null }
        / '#' (!'\n' .)* { return null }
        / '\n' { return null }

Rule = path:Module handle:(':' Method)? space+ data:Data {
  var result = {};
  result.fqn = path + ':' + (handle ? handle[1] : 'add-router-rule');
  result.data = data;
  return result;
}

Module = d:'.'? h:AssetName t:('.' AssetName)* {
  var fqn = [h];
  for (var i = 0; i < t.length; i++) fqn.push(t[i][1]);
  if (d != null) fqn.unshift('');
  return fqn.join('.');
}

AssetName = [A-Z0-9][a-zA-Z0-9_\-]* { return text() }

Method = [a-zA-Z0-9_\-]+ { return text() }

Data = DataMultiLine / DataSingleLine
DataSingleLine = h:(!'\n' .)* ('\n' / eof) {
  var result = [];
  for (var i = 0; i < h.length; i++) result.push(h[i][1]);
  return result.join('');
}
DataMultiLine = h:(!'\\\n' .)* '\\\n' t:Data {
  var result = [];
  for (var i = 0; i < h.length; i++) result.push(h[i][1]);
  result.push('\n', t);
  return result.join('');
}
