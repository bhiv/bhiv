```
                _         _      
    _   _  ___ | | ___   (_)___  
   | | | |/ _ \| |/ _ \  | / __| 
   | |_| | (_) | | (_) | | \__ \ 
    \__, |\___/|_|\___(_)/ |___/ 
    |___/              |__/      
```
A framework for scalabe and splittable backend, it bring a single design pattern which enable you to produce maintainable code.
  * isomorphic
  * flow based exectution
  * event sourcing like
  * DDD / CQRS ability
  * async ORM with abstract connector

Fully undocumented (sorry about that) but it should comming soon

TODO:
  * Force patch procedure ordered !
  * Refactor Collection using "field" instead of "type"
  * Allow Yaml format config files
  * Add syntax for merging behavior
  * Handle react / redux (replacement of NSB https://github.com/np42/yolojs/tree/b1009616e66a7aa5c82d4582e7f84a49fdd10e10/app/Widget)
  * Server side rendering (for SEO)
  * Add pattern matching, reduce,  basic async pattern to Bhiv (flow based execution)
  * Add outlets api (e.g. node.when('subscribe', 'before', (payload, callback) => { ... }))
  * Fix inlets settings
  * Add hot code swapping
  * Add submodule based parser for Routing module
  * Flow control (c.f: Bhiv)
  * handle cross dependencies better

# Yolo.Node Pattern:

The Yolo.Node pattern is an omnipotent object which can:
  * have properties, methods and events
  * have children (like dom)
  * have extended model capability
  * have sibling (like inheritence)
  * have event rerouting capability
  * have children autoloading

## Access the data
`Selector: [data.path]`

  * .get('data.path')
  * .set('data.path', value)

## Methods usage
`Selector: :method-name`

  * .on('method-name', function (payload, callback) {}) // Async
  * .on('method-name', function (payload) {}) // Sync
  * .emit('method-name', \<payload>[, \<callback>])

## Events usage (WIP)

  * .when('event-name', function (event) {})
  * .trigger('event-name', \<event>)

## Tree
`Selector: Root.Parent.Child'
`Selector: .Child'

  * .attach(\<node>, 'Name')
  * .detach()
  * .detachChild('Name')
  * .getChild('Name')
  * .getChild('Path.To.Child')
  * .getChildren()
  * .getChildrenNames()
  * .match(\<pattern>)
  * .setParent(\<node>)
 
## Inheritance
  * .hasLayout('Name')
  * .getFirstLayout('Name') // (WIP)
  * .getLastLayout('Name') // (WIP)
  * .setOlder(\<node>)
  * .top()
  * .fold(\<iterator>, \<accumulator>) // synchronous


## Model
`Selector: /field_name`

  * .kind(\<kind>)
  * .check('rule-name', \<function>)
  * .fix()

## Traveral

  * send(\<selector>, \<payload>, \<callback>)
  * 






  
