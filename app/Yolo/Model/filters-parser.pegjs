_ = ws c:ComparisonP1 ws { return c; }

Path = [a-z_]i+ (ws '.' ws [a-z_]i+)* { return { type: 'path', value: text() }; }

Data = v:JSON { return { type: 'data', value: v }; }

Value = Data / Path

ComparisonP1 = Or / And / ComparisonP2

Or = l:ComparisonP2 ws '|' ws r:ComparisonP2 {
  return { type: 'or', left: l, right: r };
}

And = l:ComparisonP2 ws [&,] ws r:ComparisonP2 {
  return { type: 'and', left: l, right: r };
}

ComparisonP2 = Equal / Lesser / Greater / Range / Match / Group

Equal = l:Value ws ':' ws r:Value {
  return { type: 'equal', left: l, right: r };
}

Lesser = l:Value ws '<' ws r:Value {
  return { type: 'lesser', left: l, right: r };
}

Greater = l:Value ws '>' ws r:Value {
  return { type: 'greater', left: l, right: r };
}

Range = l:Value ws '><' ws r1:Value ws ',' ws r2:Value {
  return { type: 'between', left: l, from: r1, to: r2 };
}

Match = l:Value ws '~' ws r:Value {
  return { type: 'match', left: l, right: r };
}

Group = '(' c:ComparisonP1 ')'

JSON = v:JSON_Value { return JSON.parse(text()); }

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

whitespace = [ \n\r\t\v\uFEFF]
ws = whitespace*
hex = [0-9a-f]i
digit = [0-9]