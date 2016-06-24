{
  var depths = [];

  var start_block = function (s) {
    var l = s.split('\n').pop().length
    depths.unshift(l);
  };

  var indent_line = function (s) {
    var l = s.length;
    var base = depths[0] | 0;
    if (l >= base) return s;
    depths.shift();
    return null;
  };
}

Main = ws s:Structure ws { return s; }

Structure = n:Tags? ws i:Implements? ws d:Definition {
  var result = { tags: n, layouts: i, rules: d };
  return result;
}

Tags = '[' ws h:Name t:(ws ',' ws Name)* ']' {
  var list = [h];
  for (var i = 0; i < t.length; i++) list.push(t[i][3]);
  return list;
}

Name = MetaKey

MetaKey = [a-z0-9]+ ('-' [a-z0-9]+)* { return text(); }

Implements = Fqns

Fqns = h:Fqn t:(ws ',' ws Fqn)* {
  var list = [h];
  for (var i = 0; i < t.length; i++) list.push(t[i][3]);
  return list;
}

Fqn = h:ChildName t:(ws '.' ws ChildName)*  {
  var list = [h];
  for (var i = 0; i < t.length; i++) list.push(t[i][3]);
  return list.join('.');
}

ChildName = [A-Z][a-zA-Z0-9]* { return text() }

Definition = '{' ws r:Rules? ws '}' { return r || []; }

Rules = h:Rule t:(ws Rule)* {
  var list = [h];
  for (var i = 0; i < t.length; i++) list.push(t[i][1]);
  return list;
}

Rule = DataRule / InletRule / ChildRule / RewriteRule / ElderRule / CustomRule

DataRule = SetRule

SetRule = m:DataRuleMethod space k:DataRuleKey ws ':' v:Value {
  return { slot: 'data', method: m, path: k.path, type: k.type, value: v };
}

DataRuleKey = t:Fqn ws p:Path { return { type: t, path: p }; }
            / p:Path { return { type: 'Json', path: p }; }

DataRuleMethod = '+' { return 'push'; }
               / '-' { return 'set'; }

Path = VarName (ws '.' ws VarName)* { return text(); }

VarName = [a-zA-Z_$][a-zA-Z0-9_$]* { return text() }

Value = SingleLineValue / MultiLineValue

SingleLineValue = space* [^\n]+ '\n' { return text(); }

MultiLineValue = space* '\n' v:BlockValue { return v; }

BlockValue = &StartBlockValue h:BlockValueLine t:(nl BlockValueLine)* {
  var lines = [h];
  for (var i = 0; i < t.length; i++) lines.push(t[i][1]);
  return lines.join('\n');
}

StartBlockValue = ws { start_block(text()); }

BlockValueLine = BlockValueLineEmpty / BlockValueLineDefined

BlockValueLineEmpty = space* &'\n' { return text(); }

BlockValueLineDefined = i:Indent t:text {
  if (i == null) return peg$FAILED;
  return i + t;
}

Indent = ' '* { return indent_line(text()); }

ElderRule = '~' space f:Fqn {
  return { slot: 'layout', method: 'add', fqn: f };
}

InletRule = InletRuleSpecific / InletRuleGeneric

InletMethodOn = '>'

InletRuleGeneric = InletMethodOn space n:Name ws ':' ws s:Structure {
  return { slot: 'inlet', method: 'add-structure', name: n, structure: s };
}

InletRuleSpecific = InletMethodOn ws t:Fqn ws n:Name ws ':' v:Value {
  return { slot: 'inlet', method: 'add-custom', name: n, type: t, value: v };
}

ChildRule = '=' space n:ChildName ws ':' ws s:Structure {
  return { slot: 'child', method: 'define', name: n, structure: s };
}

RewriteRule = '@' space s:Selector ws m:RewriteRuleMethod ws d:Structure {
  return { slot: 'rewrite', method: m, selector: s, structure: d };
}

RewriteRuleMethod = ':' { return 'replace'; }
                  / '&' { return 'apply'; }

Selector = &([A-Z0-9\[]) h:SelectorFilter t:(ws '.' ws SelectorFilter)*  {
  var list = [h];
  for (var i = 0; i < t.length; i++) list.push(t[i][3]);
  return list;
}

SelectorFilter = c:ChildName ws t:Tags? { return { child: c, tags: t }; }
               / t:Tags                 { return { tags: t }; }

CustomRule = '->' ws f:Fqn ws a:Arguments ws ':' v:Value {
  return { slot: 'custom', method: 'fqn', fqn: f, args: a, value: v };
}

Arguments = h:Argument t:(space Argument)* {
  var list = [h];
  for (var i = 0; i < t.length; i++) list.push(t[i][1]);
  return list;
}

Argument = [^ :]+ { return text(); }

SingleLineComment = '//' (!'\n' .)* '\n'

MultiLineComment = '/*' (!'*/' .)* '*/'

space = [ \t]+
      / MultiLineComment

ws = [ \n\r\t\v\uFEFF]*
   / MultiLineComment
   / SingleLineComment

nl = '\n'

text = [^\n]* { return text(); }

char = [a-zA-Z0-9]

