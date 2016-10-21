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
          / '@' ws s:SliceProjection { return s; }
          / '[' ws s:SlicePath ws ']' { return s; }

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

SliceInlet = [a-z0-9\-]+ {
  return { type: 'inlet', name: text() };
}

SliceField = [a-z0-9_]+ {
  return { type: 'field', name: text() };
}

SliceProjection = [a-z0-9\-]+ {
  return { type: 'projection', name: text() };
}

SlicePath = h:Path t:(ws '.' ws Path)* {
  var path = [h];
  for (var i = 0; i < t.length; i++) path.push(t[i][3]);
  return { type: 'data', path: path.join('.') };
}

Path = [a-z0-9_\-]i+ { return text() }

ws = [ \n\r\t\v\uFEFF]*
