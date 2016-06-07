Main = ws s:Selector ws { return s; }

Selector = h:Selection t:(ws '.' ws Selection)* {
  var list = [h];
  for (var i = 0; i < t.length; i++) list.push(t[i][3]);
  return list;
}

Selection = n:Name t:Tags? {
  var result = {};
  result.name = n;
  if (t) result.tags = t;
  return result;
}

Name = [A-Za-z0-9]+ { return text(); }

Tags = '[' ws h:MetaKey t:(ws ',' ws MetaKey) ws ']' {
  var list = [h];
  for (var i = 0; i < t.length; i++) list.push(t[i][3]);
  return list;
}

MetaKey = [a-z0-9]+ ('-' [a-z0-9]+)* { return text(); }

ws = [ \n\r\t\v\uFEFF]*
