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

Main = ws s:TypeDefinition ws { return s; }

/*******************************/

Type = TypeCall / TypeDefinition

TypeCall = Argument / TypeDeclaration

Argument = '_' d:Class { return { type: 'parameter', value: d }; }

TypeDeclaration = TypeName (ws TypeParameter)?

TypeName = h:Class ws t:('.' ws Class)* {
  var list = [h];
  for (var i = 0; i < t.length; i++) list.push(t[i][2]);
  return list.join('.');
}

Parameters = '<' ws h:TypeCall t:(ws ',' ws TypeCall) ws '>' {
  var list = [h];
  for (var i = 0; i < t.length; i++) list.push(t[i][3]);
  return list;
}

Arguments = '<' ws h:Argument t:(ws ',' ws Argument) ws '>' {
  var list = [h];
  for (var i = 0; i < t.length; i++) list.push(t[i][3]);
  return list;
}

Fqn = t:TypeName? ws ':' ws m:Token { return t + ':' + m; }

TypeDefinition = Figure ws '{' ws Definition ws '}'

Figure = 'Leaf'
       / 'Node' TypeParameters?
       / 'Branch' TypeParameters?
       / 'Cluster' TypeParameters

Definition = e:(Extend ws)?
             i:(Identifier ws)?
             a:(Adapter ws)?
             b:(Body ws)?
             m:(Methods ws)?
             f:(Inputs ws)?
  { return {}; }

Extend = 'extend' ws ':' ws t:TypeName

Identifier = 'identifier' ws ':' ws i:IdentifierValue

IdentifierValue = h:TypeName t:(ws IdentifierParametersValue)?

IdentifierParametersValue = p:IdentifierParameters t:(ws '.' ws IdentifierValue)?

IdentifierParameters = '(' ws t:Fqn (ws ',' ws Fqn)* ')'

Adapter = 'adapter' ws ':' ws TypeName

Body = Leaf
     / Nodes
     / Collection
     / Branches

Leaf = 'pattern' ws ':' ws LeafValue

LeafValue = RegExp

Nodes = h:Node t:(ws Node)* {
  var list = [h];
  for (var i = 0; i < t.length; i++) list.push(t[i][1]);
  return list;
}

Node = 'field' space n:Token ws ':' ws t:Type

Branches = Branch t:(ws Branch)* {
  var list = [h];
  for (var i = 0; i < t.length; i++) list.push(t[i][1]);
  return list;
}

Branch = 'case' space n:Token ws ':' Type

Cluster = i:ClusterIndex
          t:ClusterTemplate

ClusterIndex = 'index' ws ':' ws t:Type

ClusterTemplate = 'template' ws ':' ws t:Type

Methods = Method (ws Method)* {

}

Method = c:(Context ws)? ws n:MethodNaming ws f:Function {

}

MethodNaming = 'on'    space n:Token
             / 'from'  space n:Class
             / 'to'    space n:Class
             / 'check' space n:Token
             / 'fix'   space n:Token

Function = FunctionDSL / FunctionJavascript

FunctionDSL = p:Parser ws ':' v:Value {

}

Parser = '@' ws t:TypeCall {

}

Context = '[' ws h:TypeName t:(ws ',' ws TypeName)* ws ']' {

}

Value = ValueSingleLine / ValueMultiLine

ValueSingleLine = space* [^\n]+ '\n' { return text(); }

ValueMultiLine = space* '\n' v:BlockValue { return v; }

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

FunctionJavascript = ':' ws ES6_Function

/*************************************/



/*************************************/

JSON = v:JSON_Value { return JSON.parse(v); }

JSON_Object = '{' ws JSON_Object_fields? ws '}'

JSON_Object_fields = JSON_Object_field ws (',' ws JSON_Object_field ws)*

JSON_Object_field = JSON_String ws ':' ws JSON_Value

JSON_Array = '[' ws JSON_Array_values? ws ']'

JSON_Array_values = JSON_Value ws (',' ws JSON_Value ws)*

JSON_Value = JSON_Primitives / JSON_Number / JSON_String / JSON_Array / JSON_Object

JSON_String = '"' JSON_Character* '"'

JSON_Character = JSON_Character_unicode / JSON_Character_escaped

JSON_Character_unicode = !'\n' [^\\"]

JSON_Character_escaped = '\\' (["\\/bfnrt] / ('u' hex hex hex hex))

JSON_Number = '-' ? JSON_Number_digit JSON_Number_decimal ? JSON_Number_tenp ?

JSON_Number_digit = '0' / ([1-9] digit*)

JSON_Number_decimal = '.' digit+

JSON_Number_tenp = [eE] ('+' / '-') ? digit+

JSON_Primitives = 'null' / 'false' / 'true'

/*************************************/

RegExp = '/' p:RegExpSource+ '/' f:RegExpFlags ? {
  return { type: 'regexp', source: p.join(''), flags: f || '' };
}

RegExpSource = [^/] / '\\\\' / '\\/'

RegExpFlags = [gimu]*

/*************************************/

Class = [A-Z0-9] char* { return text(); }

Token = [a-z0-9] ('-'? [A-Za-z0-9]+)* { return text(); }

Natural = '0' { return 0; }
        / [1-9][0-9]* { return parseInt(text(), 10); }

/*************************************/

SingleLineComment = '//' (!'\n' .)* &EOL

MultiLineComment = '/*' (!'*/' .)* '*/'

/*************************************/

EOF = !.

EOL = '\n' / EOF

/*************************************/

whitespace = [ \n\r\t\v\uFEFF]

space = (whitespace / MultiLineComment / SingleLineComment)+

ws = (whitespace / MultiLineComment / SingleLineComment)*

blank = ([ \r\t\v\uFEFF] / MultiLineComment / SingleLineComment)+

nl = '\n'

text = [^\n]* { return text(); }

char = [a-zA-Z0-9]

hex = [0-9a-f]i
