## scheme: `=' 
  escape value

## scheme: `$'
  syntax for getting data from flow, currently only support path.to.data access style and @ for flow itself
  a complete language like jmespath or jq syntax will be implemented

## scheme: `%'
  syntax for constructing string include several sub interpolation:
  #{ ... } to get data from node data 
  %{ ... } to get node property like name, cwd, ...
  &{ ... } to get data from Global Config exemple Full.Module.Path:then.path.to.data
  ${ ... } to get data from flow
  ={ ... } to insert expression as it



