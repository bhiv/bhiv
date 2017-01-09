/*

type: 'self' / 'child' / 'data' / 'field' / 'inlet'

[child]
  - name -> String
  - args -> Array<Fqn>

[data]
  - path -> String

[field]
  - name -> String

[inlet]
  - name -> String

*/

Main = ws s:Selector ws { return s; }

Selector = h:SelectorFirst ws t:SelectorN* {
  var selectors = [h].concat(t);
  if (selectors[0].type == 'self') selectors.shift();
  else selectors.unshift({ type: 'root' });
  return selectors;
}

SelectorFirst = SliceSelf
              / SliceChild

SelectorN = '.' ws s:SliceChild { return s; }
          / ':' ws s:SliceInlet { return s; }
          / '/' ws s:SliceField { return s; }
          / '[' ws s:SlicePath ws ']' { return s; }
          / '@' ws s:SliceExecution { return s; }

SliceSelf = &([^A-Z]) { return { type: 'self' } };

SliceChild = n:Child ws p:Parameters? {
  return { type: 'child', name: n, args: p || [] };
}

Child = [A-Z][a-z0-9]i* { return text(); }

Parameters = '<' ws h:Selector t:(ws ',' ws Selector)* ws '>' {
  var parameters = [h];
  for (var i = 0; i < t.length; i++) parameters.push(t[i][3]);
  return parameters;
}

SliceInlet = n:SliceInletName t:(ws SliceInletTrack)? {
  return { type: 'inlet', name: n, track: t ? t[1] : null };
}

SliceInletName = [a-z0-9\-]+ { return text(); }

SliceInletTrack = '~' ws t:('prepare' / 'execute' / 'format') {
  return t;
}

SliceField = [a-z0-9_]+ {
  return { type: 'field', name: text() };
}

SliceExecution = p:FullPath? a:SliceExecutionArguments {
  return { type: 'execution', path: p || null, args: a };
}

SliceExecutionArguments = '(' l:(ws PathDynamic (ws ',' ws PathDynamic)*)? ws ')' {
  var args = [];
  if (l == null) return args;
  args.push(l[1])
  var n = l[2] || [];
  for (var i = 0; i < n.length; i++)
    args.push(n[i][3]);
  return args;
}

SlicePath = fp:FullPath {
  return { type: 'data', path: fp };
}

FullPath = h:Path t:(ws '.' ws Path)* {
  var path = [h];
  for (var i = 0; i < t.length; i++) path.push(t[i][3]);
  return path;
}

ThisPath = '.' {
  return [];
}

Path = PathLiteral / PathDynamic

PathLiteral = [a-z0-9_\-]i+ {
  return { type: 'literal', value: text() }
}

PathDynamic = '${' ws fp:(FullPath / ThisPath) ws '}' {
  return { type: 'dynamic', path: fp };
}

ws = [ \n\r\t\v\uFEFF]*
