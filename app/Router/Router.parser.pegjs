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

Rule = Engine_HttpMiddleware
     / Engine_Http
     / Engine_PrefetchHttp
     / Engine_PrefetchView

Engine_HttpMiddleware = 'Http.Middleware' ws a:Fqn {
  var result        = {};
  result._type      = 'Adapter.Http.Server';
  result.name       = 'Http';
  result.handle     = 'middleware';
  result.fqn        = a;
  return result;
}

Engine_Http = 'Http' ws m:Http_Methods ws l:Http_Path ws r:Render {
  var result        = {};
  result._type      = 'Adapter.Http.Server';
  result.name       = 'Http';
  result.handle     = 'query';
  result.methods    = m;
  result.location   = l;
  result.render     = r;
  return result;
}

Engine_PrefetchHttp = 'Prefetch.Http' ws p:Http_Path {
  var result        = {};
  result._type      = 'Router.Prefetch';
  result.name       = 'Prefetch';
  result.handle     = 'fetch-http';
  result.path       = p;
  return result;
}

Engine_PrefetchView = 'Prefetch.View' ws m:Modules {
  var result        = {};
  result._type      = 'Router.Prefetch';
  result.name       = 'Prefetch';
  result.handle     = 'fetch-view';
  result.views      = m;
  return result;
}

Http_Header_Field = [A-Z0-9a-z\-]+ { return text(); }

StringComparator = '=' { return 'equal'; }
                 / '~' { return 'regexp'; }

Render = Render_Fqn

Render_Fqn = (& [A-Z.]) f:Fqn {
  return { _type: 'Render.Fqn', path: f };
}

Modules = h:Module t:(ws ',' ws Module)* {
  var mods = [h];
  for (var i = 0; i < t.length; i++) mods.push(t[i][3]);
  return mods;
}

Module = d:'.'? h:AssetName t:('.' AssetName)* {
  var fqn = [h];
  for (var i = 0; i < t.length; i++) fqn.push(t[i][1]);
  if (d != null) fqn.unshift('');
  return fqn.join('.');
}

Fqn = mod:Module ':' m:AssetName {
  return mod + ':' + m;
}

AssetName = [a-zA-Z0-9_\-]+ { return text() }

Meta_Key = [a-z0-9A-Z\-]+ { return text() }

Meta_Space = d:digit+ { return parseInt(d.join(''), 10); }

File_Path = [a-zA-Z0-9_\-.]+ { return text() }

Http_Path = '/' Http_Path_Format? { return text(); }

Http_Path_Format = Http_Path_Defined Http_Path_Format*
                 / Http_Path_Variable Http_Path_Format*
                 / Http_Path_Wildcard

Http_Path_Defined = [a-zA-Z0-9.\-/_]+

Http_Path_Variable = ':' [a-zA-Z] [a-zA-Z0-9]* [*+?]?

Http_Path_Wildcard = '*'

Http_Methods = h:Http_Method t:(ws ',' ws Http_Method)* {
  var unicity = {};
  unicity[h] = true;
  for (var i = 0; i < t.length; i++)
        unicity[t[i][3]] = true;
   return Object.keys(unicity);
}

Http_Method = 'GET' / 'POST' / 'PUT' / 'HEAD' / 'PATCH' / 'DELETE' / 'OPTIONS'

Pattern = ('\\ ' / (!' ' .))+ { return text() }

