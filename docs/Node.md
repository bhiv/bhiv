# Node

## Structure:

### inherit(<layout>) -> This

### attach(<node>, <child-name>) -> This

### detach() -> Node

### detachChild(<child-name>) -> Node

### detachChild(<node>) -> Node

### create(<layout>, <place>, <callback>?) -> Node

### create(<layout>, <callback>?) -> Node

### build(<layout>, <callback>?) -> Node

### getChild(<child-name>) -> Node

### getChildren() -> Array<Node>

### parent -> Node

### mapreduce(<map-function>, <reduce-function>, <callback>) -> This
  
## Data:

### set(<path>, <value>, <options>?) -> Boolean

### get(<path>) -> Value

## Inlet:

### on(<method-name>, <function>) -> This

### on(<method-name>) ... end() -> Then

### execute(<method-name>, <flow>, <callback>) -> Action

## Outlet:

### listen(<event-name>, <function>, <options>?) -> This

### listen(<event-name>, <target-path>, <options>?) -> This

### listen(<event-name>, <options>?) ... end() -> This

### emit(<event-name>, <flow>) -> This

## Model:

### kind(<type>) -> This

### model(<layout>) -> This

### field(<path>, <layout>, <options>?) -> This

## Workflow:

### send(<query>, <flow>, <callback>?) -> Action

### begin() ... end(<flow>, <callback>?) -> Action
