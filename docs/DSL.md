## scheme: `=' 
  escape value

## scheme: `$'
  syntax for getting data from flow, currently only support path.to.data access style and @ for flow itself
  a complete language like jmespath or jq syntax will be implemented

## scheme: `#'
  get value from node data
  
## scheme: `%'
  syntax for constructing string include several sub interpolation:
  #{ ... } to get value from node data 
  %{ ... } to get node property like name, cwd, ...
  &{ ... } to get value from Global Config exemple Full.Module.Path:then.path.to.data
  ${ ... } to get value from flow
  ={ ... } to insert expression as it
  >{ ... } to execute ast 

## scheme: `>'
  
Yolo Query Language:

  Absolute.Module.Path : inlet-name   (execute)
  Absolute.Module.Path # path.to.data (get)
  Absolute.Module.Path = path.to.data (set)
  Absolute.Module.Path / field.name   (field)
  Absolute.Module.Path ! outlet-name  (emit)
