/*********************/
/**** Waterfall ******/
/*********************/

/** To insert a breakpoint for debugging
 */
.debug() => Self

/** To alter flow
 *    @param: <method>: ('copy' | 'inherit') =>
 */
.flow(<method>) => Self

/** To change the current working node
 *    @param: <location>: (string) =>
 */
.relocate(<location>) => Self

/** To transform the flow
 *    @param: <glue>: (*) =>
 */
.as(<glue>) => Merger Self

/** To execute a function
 *    @param: <identifier>: (string | function) =>
 *    @param: <glue>: (*)                       =>
 */
.then(<identifier>[, <glue>]) => Merger Self

/** To execute a function in parallel but do not wait for response
 *    @param: <identifier>: (string | function) =>
 *    @param: <glue>: (*)                       =>
 */
.defer(<identifier>[, <glue>]) => Self

/** Create a pipe flow
 */
.Pipe()  => Waterfall
.  end() => Merger Parent

/** To execute multiple tasks in parallel in order to build an object
 *    @subflow: { flow, value } -> value
 *    @param: <glue>: (*)      => to change the subflow
 *    @param: <path>: (string) => branch to set or replace, can not be defined twice
 */
.Race(<glue>) => Race Self
.  At(<path>) => RaceoBranch Self
.  end()      => Merger Parent

/** To execute a waterfall in parallel but do not wait for response
 *    @subflow: flow -> value
 */
.Sideway() => Waterfall Self
.  end()   => Merger Parent

/** To make an execution loop
 *    @subflow: { flow, times } -> flow
 *    @param: <test>: (*)       => execute subwaterfall until @test return a truly value
 *    @param: <delay>: (number) => wait @delay (ms) before doing it again [default: 0]
 */
.Until(<test>[, <delay>[, <glue>]]) => Waterfall Self
.  end()                            => Self

/** To retry a subflow each time an error occure
 *    @subflow: { flow, times } -> flow
 *    @param: <test>: (*)       => 
 *    @param: <delay>: (number) => delay before next retry
 *    @param: <count>: (number) => 
 */
.Retry(<number>, <delay>, <test>)
.  end()

/** To iterate over each element
 *    @subflow: { key, value, flow } ->  value
 *    @param: <source>: (null | undefined | '.') => current flow
 *    @param: <source>: (string)                 => path to array (e.g. path.to.array)
 *    @param: <source>: (array)                  => it's source itself
 */
.Map([<source>]) => Waterfall Self
.  end()         => Merger Self

/** To iterate over a list in order to pass a accumulator from a function to the next */
 *    @subflow: { key, value, flow, accu } ->  value
 *    @param: <accu>: (*)                        => the initial value
 *    @param: <source>: (null | undefined | '.') => current flow
 *    @param: <source>: (string)                 => path to array (e.g. path.to.array)
 *    @param: <source>: (array)                  => it's source itself
.Fold([<accu>[, <source>]]) => Waterfall Self
.  end()                    => Merger Self

/** To iterate over each element
 *    @subflow: { left, right, flow } ->  value
 *    @param: <source>: (null | undefined | '.') => current flow
 *    @param: <source>: (string)                 => path to array (e.g. path.to.array)
 *    @param: <source>: (array)                  => it's source itself
 */
.Reduce([<source>]) => Waterfall Self
.  end()            => Merger Self

/** To filter a collection */
 *    @subflow: { key, value, flow } -> Boolean:keep
 *    @param: <source>: (null | undefined | '.') => current flow
 *    @param: <source>: (string)                 => path to array (e.g. path.to.array)
 *    @param: <source>: (array)                  => it's source itself
 */
.Filter([<source>]) => Waterfall Self
.  end()            => Merger Self

/** To find the first item which respond positively
 *    @subflow: { key, value, flow } -> value
 *    @param: <source>: (null | undefined | '.') => current flow
 *    @param: <source>: (string)                 => path to array (e.g. path.to.array)
 *    @param: <source>: (array)                  => it's source itself
 */
.Detect([<source>]) => Waterfall Self
.  end()            => Merger Self

/** To branch workflow
 *    @param: <view>: (string | Object)                => a query to extract from flow a subset of data
 *    @param: <test>: (string | Function | RegExp)     => 
 *    @param: <value>: (null | bool | number | string) => 
 *    @param: <type>: (string)
 */
.Match([<view>])           => Match Self
.  When(<test>)            => MatchCase Waterfall Self
.  WhenEquiv(<value>)      => MatchCase Waterfall Self
.  WhenType(<type>[, ...]) => MatchCase Waterfall Self
.  Otherwise()             => Waterfall Self
.  end()                   => Merger Parent

/** To execute a sub workflow only if condition do not satisfy
 *    @param: <test>: (*) => execute subwaterfall unless @test return a truly value
 */
.Unless(<test>) => Waterfall Self
.  end()        => Parent

/** To memoize a success execution result for a limited duration
 *    @param: <duration>: (number) => delay before cache expire
 *    @param: <key>: (string)      => 
 */
.memoize(<duration>[, <key>]) => Waterfall Self

/** To return a value if specific condition
 *    @param: <test>: (*)                       =>
 *    @param: <identifier>: (string | function) =>
 *    @param: <glue>: (*)                       =>
 */
.shunt(<test>[, <identifier>[, <glue>]]) => Waterfall Self

/** To catch an error if pattern match
 *    @flow: { error, payload } -> when caught
 *    @param: <test>: (*)                       =>
 *    @param: <identifier>: (string | function) =>
 *    @param: <glue>: (*)                       =>
 */
.trap(<test>[, identifier[, <glue>]]) => Waterfall Self

/** To stop execution
 *    @param: <test>: (*) =>
 *    @param: <glue>: (*) =>
 *    @param: <code>: (String | Number) =>
 */
.assert(<test>[, <glue>[, <code>]]) => Waterfall Self

/** To catch an error if pattern match
 *    @param: <error>: (string) =>
 */
.failWith(error) => Self

/*******************/
/** Dependencies ***/
/*******************/

/** To require a sub typed object
 *    @param: <module>: String => required module path e.g. Mailer.SMTP
 *    @param: <name>: String => glue to define child name
 *    @param: <lifetime>: Number => duration (ms) if this module not called will be garbage collected

.Require(<module>, <name>, <lifetime>)
.  end()
 
/*******************/
/***** Merger ******/
/*******************/

/** To merge result with flow
 *    @param: <path>: String => merge result to content
 *    @param: <path>: Object => merge 
 */
.merge(<path>[, <glue>]) => Parent

/** To merge in specific way the reesult and flow
 *    @subflow: { payload, result } -> flow
 */
.wrap(<glue>) => Parent

/** To replace
 */
.replace(<path>) => Parent

/** To push data into an array
 */
.append(<path>) => Parent

/** To unshift data into an array
 */
.prepend(<path>) => Parent

/** To discard returned value and keep the flow as it
 */
.dismiss() => Parent

/**********************/
/***** Templating *****/
/**********************/

/** To create a anchor which can help an other function to use it as template
 *    @param: <tags>: (string) => anchor tags
 */
.Block(<tags>) => Waterfall Self
.  end()

/** To use an other function but changing some part (c.f. block)
 *    @param: <fqn>: (string) => a function identifier
 */
.Use(<fqn>)         => Self MetaCall
.  At(<tags>)       => Self MetaCall Position
.    inject(<data>) => Self MetaCall Position Merger
.    Do()           => Self MetaCall Position Waterfall
.      .end()
.  end()

