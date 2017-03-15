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
  * Yolo.Core:
    * Clean old functions not used anymore
    * Implement custom DSL for: VM ("$" scheme keyword), Node (* scheme)
    * Refactor Collection using "field" instead of "type"
    * Add outlets api (e.g. node.when('subscribe', 'before', (payload, callback) => { ... }))
    * Add hot code swapping
    * Add submodule based parser for Routing module
    * Handle better cross dependencies
  * Yolo.Framework:
    * Allow Yaml, XML, ... config files formats
    * Add syntax for configuration merging behavior
  * Yolo.Packages:
    * Create a package manager environment
    * Handle react / redux or smth else (replacement of NSB https://github.com/np42/yolojs/tree/b1009616e66a7aa5c82d4582e7f84a49fdd10e10/app/Widget)
    * Server side rendering (for SEO)
  * Yolo.Shell:
    * Add command to add / remove / list packages

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
  * .oldest()
  * .newest()
  * .fold(\<iterator>, \<accumulator>) // synchronous

## Model
`Selector: /field_name`

  * .kind(\<kind>)
  * .check('rule-name', \<function>)
  * .fix()

## Producer
`Selector: @producer_name`

 * .produce(\<producer_name>, \<view>)

## Traveral

  * send(\<selector>, \<payload>, \<callback>)

## Yolo.Node.Flux

### Standard callback
  * callback() => callback.emit('done', null);
  * callback(<data>) => callback.emit('error', <data>)
  * callback(null, <data>) => callback.emit('done', <data>)

### Evented callback
  * callback.emit(<event-name>, <data>)

```
// at: Here
node.on('handle', function (data, callback) {
  const array = [];
  return this.node.send('Some.Where:act', data, new function () {
    this.done  = paylaod => { return callback(null, array); };
    this.data  = payload => { array.push(chunk); };
    this.error = payload => { return callback(payload); };
  });
});

// at: Some.Where
node.on('act', function (data, flux) {
  for(let i = 0; i < 100; i++)
    flux.emit('data', Math.random());
  return flux();
});
```

### Altering Flow callback
  * callback.super(<data>) // Allow you to call the parent handle
