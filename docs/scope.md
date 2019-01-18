# Scope

This document decides what features, syntax, and cases to support for voko.
It goes over how related libraries and frameworks are written, and how their
scopes overlap or differ from this reviver.

In these notes, generally React and Preact are referencing all React-like
frameworks such as Inferno.

Mithril, Preact, Val (Skate.js), and other many other libraries support features
that I'm __not__ interested in supporting for now. Here's a short list.

Not supporting:

- __Custom Elements__ since they require forwarding the `is:` attribute into
  `document.createElement`
- ~~__Namespaces__ such as SVGs and MathML. Not difficult to implement but not
  necessary for now.~~ Implemented in v3.
- __Modifying nodes__. Updating and removing attibutes is well beyond the scope
  of a reviver, even if it seemed fitting at first.
- __HTML error correction__. Mithril corrects and auto-creates parent elements
  when needed, such as auto creating `<table>` if using a `<td>` in a `<div>`
  to prevent the browser from removing the `<td>` node entirely.
- __IE 11__. An example: Only IE 11 need `setAttribute()` for `input[type=...]`
- __Spellcheck attribute__. Needs to be handled carefully for updates and
  removal, but the reviver does not need to consider modifications.
- __Late attributes for `<select>` elements__; The `value` and `selectedIndex`
  attributes can only be meaningfully set once the node is live. Ignore them.
- __React-like props__. Discussed in this document. Specifically seperating
  children from `props.children` and instead using `{ attrs, children }` for
  components; this is what Mithril does.
- __Virtual DOM things__. Such as `key`, which will just fallback to using
  `setAttribute()`

## Selector

A valid selector is a string or a function (which is called assuming it is a
component that will return a DOM node). Originally a selector could be a DOM
node as well, as a way of easily mutating existing elements like
`v($('#main'), { ... })`. However, it would add a lot of complexity to implement
that, and lowkey requires writing a DOM diffing algorithm which is not in the
scope of the reviver.

See the proposed syntax in readme.md or at the end of this document.

## Children

These are the possible children for the reviver to handle, and how they are
treated. Children are kept on a stack, as seen in _hyperscript_ and vhtml
because it makes the most sense to avoid the call stack.

- __DOM nodes__. Appended to the parent.
- __Arrays__. The reverse of the array is added to the stack of children,
  meaning the first child will be the first to be processed.
- __Objects (including functions)__. Are likely an error as children. Maybe they
  tried to apply attributes in the wrong place? Or forgot to wrap their
  component in `v(...)`. An error is thrown.
- __Everything else__. Wrapped in a text node and appended. This works for
  dates, regex, numbers, and anything that has a `.toString()`

Since this is the DOM, components are static and take care of updating
themselves however they choose to. They'll return a DOM node after being passed
attributes and children. In React/Mithril/etc the framework needs to update
components as props and state change. This reviver will not have that.

## Allowed arguments

All hyperscript revivers, for either the DOM, a virtual DOM, or HTML strings,
seem to parse arguments differently. This section looks at the various
flexibilities.

The sample below shows a combination of styles for writing hyperscript
supporting attributes in the tag and optionally as an object, and children as an
array or list of arguments. This isn't a real syntax, but a mix of existing
syntax from many projects:

```js
h('#main', [
  // allow merging classes in the tag with those in attributes
  h('a[href=/][class=link].large', { class: 'bold center' }, 'Home'),
  // allow a component (a function) to receive props and attributes
  h(MyComponent, { size: 50, gridLines: true, class: 'center' }),
  h('.btn.primary[disabled]',
    // not an array of children
    h('p', 'Button', {
      events: {
        click() { ... }
      }
    }),
    'Text',
    h('small', {
      style: { ... },
      className: 'blue'
      onclick: () => ...
    }, 'Tap me')
  ),
  // unusual document fragment syntax containing a text node and a DOM node
  h('[', [ 'Text', DOMNode ]),
])
```

There's no standard syntax for hyperscript. The example above maintains an order
of arguments `tag, attributes?, children?` but not all revivers even need that.
Here's an interesting thread discussing API syntax of various hyperscript
libraries:

https://github.com/hyperhype/hyperscript/issues/66

That project, _hyperscript_, handles arguments as loosly as possible and makes
decisions based on their type and whether or not things like tags have been
found yet. Arguments are in any order, and duplicate attributes can be
interveled with children. It's possible that API is nicer to use to some people,
but it may also cause more harm than good. The lack of structure means the code
needs to parse all arguments before knowing for sure that it can't continue if
it was never given a tag or component function. Algorithms that expect a
structure will know immediately.

An unusual structure that is still valid in _hyperscript_:

```js
h({ id: 'hello' }, [
  h(ChildComponent)
], '#ignoredId.red', 'Some text', { class: 'bold' })
```

Their algorithm checks if a parent has been made yet to apply attributes. It
will have not, so a div is made with id set to 'hello'. Other strings are text
nodes there there on out...

Equivalent to:

```html
<div id='hello' class='bold'>
  <ChildComponent ... >
  #ignoredId.red
  Some text
</div>
```

There's tradeoffs to every approach, but `tag, attributes?, children?` is not a
lot to ask for and is expected by developers from HTML. Mithril and Preact each
expect that argument order to be able to handle JSX. Preact, following React,
expects you to write in JSX so it requires the attribute parameter since Babel
always transpile to include it. Mithril however, supports JSX but doesn't expect
developers to use it so it's more flexible and treats attributes as an optional
second parameter.

Here's Mithril's argument flow allowing for optional attributes:

```js
function h(selector) {
  if (!selector) {
    throw Error(...)
  }
  let attrs = arguments[1], start = 2, children
  if (!attrs) {
    attrs = {}
  } else if (attrs is not an object, it has a tag, or is array) {
    // this 'attrs' is actually a child, so they skipped attributes
    attrs = {}
    start = 1 // start counting children one spot earlier
  }
  ...
}
```

Compared to Preact's:

```js
export function h(nodeName, attributes) {
  let children = EMPTY_CHILDREN, lastSimple, child, simple, i;
  for (i = arguments.length; i-- > 2; ) {
    stack.push(arguments[i]);
  }
  ...
}
```

As mentioned, this reviver will allow a selector to be a string or function. If
it's a function, it will be passed the attributes and children, and expected to
return a DOM node after handling all children. This is the same as JSX. DOM
nodes are only valid as children, not selectors. Function may call recursively,
and the reviver will simply keep calling.

## Tree traversal

Preact, _hyperscript_, and vhtml don't seem to traverse children at all. I
believe they expect them to be already evaluated due to the nature of the JS
evaluating the called function as it encounters each child. There's a function
stack that is emptied from the leafs to the root. Not the other way around, even
though that's how we code looks like it's traversing it.

However, Mithril does actually mention traversing the tree depth first from the
root down, as children of each parent are handled by _"normalizing"_ them
recursively using `Vnode.normalizeChildren` as seen here (paraphrased):

```js
const Vnode = (tag, key, attrs, children, text, dom) =>
  ({ tag, key, attrs, children, text, dom, domSize: undefined, state: undefined, events: undefined, instance: undefined })
}

Vnode.normalize = node => {
  if (Array.isArray(node))
    return Vnode('[', undefined, undefined, Vnode.normalizeChildren(node), undefined, undefined)
  if (node != null && typeof node !== 'object')
    return Vnode('#', undefined, undefined, node === false ? '' : node, undefined, undefined)
  return node
}

Vnode.normalizeChildren = input => input.map(Vnode.normalize)
```

## Case sensitivity of DOM events

Because attributes are often merged into a DOM node's properties, it makes sense
to have functions like `onclick` be lowercase as object properties are case
sensitive and always lowercase. However, no implementations actually apply
events by assigning an object that way. This is because only _one_ function can
be registered to an event that way. The more flexible approach is to use the DOM
API `addEventListener()`.

I think it's more readable to use a JSX/React-like capitalized `onClick` syntax,
but it seems like it doesn't matter at all - everything just gets lowercased in
the end. Example Inferno (which also uses JSX) code:

From _inferno/src/DOM/events/delegation.ts_

```js
function normalizeEventName(name) {
  return name.substr(2).toLowerCase();
}
```

## CSS

It's common in JSX to set styles without units and have them know when to
default to _px_ (properties like opacity and flex do not have _px_). This was
discussed in an issue thread on _hyperscript_, and they decided it was too hard
to keep track to which properties it applies. However, Preact has a nice regex
to check, which I've lifted to voko.

Mithril has some test cases on CSS:

```js
m('button-bar',
  m('button',
    {style: 'width:10px; height:10px; border:1px solid #FFF;'},
    'Normal CSS'
  ),
  m('button',
    {style: 'top:0 ; right: 20'},
    'Poor CSS'
  ),
  m('button',
    {style: 'invalid-prop:1;font:12px/1.1 arial,sans-serif;', icon: true},
    'Poorer CSS'
  ),
  m('button',
    {style: {margin: 0, padding: '10px', overflow: 'visible'}},
    'Object CSS'
  )
)
```

Some libraries take a `props` object that defines _both_ `events` and `attrs` to
allow for regex-less event listener names. Others allow namespacing for XML!
Another uses `hooks` like `beforeRevomal` to aid in transitions...wew.

The Mithril author chimed in at the end of issue #66 (mentioned earlier). He
mentioned JSX that compatibility should be prioritized since some people will
never write hyperscript directly (even if it's short/better/compile-less) and
that's just a fact. Otherwise, try supporting existing HTML and JS APIs.

He also mentions hiccups in those:

> There are variations in how attributes are handled, with some implementations
> allowing `class`, `readonly`, `contenteditable` instead of `className` /
> `readOnly` / `contentEditable` and some not. There are also spec deviations
> (e.g. React's `onClick` vs Mithril/HTML/JS's `onclick`). In Mithril, the
> recommendation is to stay close to HTML spec, but it also supports the JS API
> (i.e. both readonly and readOnly)

Other troubled properties:
  - class: className
  - for: htmlFor
  - http-equiv: httpEquiv

Note that properties are different than attributes for the DOM. An SO comment at
https://stackoverflow.com/questions/15750290/ mentions:

> DOM conceptually works with objects and properties. htmlFor is the correct way
> by setting the DOM element's property. No need to mess with attributes which
> is what setAttribute does.

Which is explained here:
https://stackoverflow.com/questions/6003819/what-is-the-difference-between-properties-and-attributes-in-html

The Mithril author makes it sound like the reviver/renderer would need a very
long list of if statements to check all attribute edge cases, but actually it's
as easy as `attr in node ? node[attr] = ... : node.setAttribute(attr, ...)`.

This reviver will be JSX compatible. A smaller version can be written for
projects that don't need compatibility with anything.

Compatibility also extends to web-components. Some libraries spend a great
amount of code ensuring they're properly supported. The `is` attribute must be
taken out (like events are) from other attributes:

```js
document.createElement('div', { is: 'my-list-item' })
```

I won't support that for now since I do not use custom elements (sorry!).

The issue thread also mentioned:

> When using, designing and documenting APIs for things [...] it’s good when one
> function returns a value or mutates things. But not both at the same time.

Not handling that also means reducing code complexity. Imagine a DOM node
already has an attribute `disabled: true`, and you pass it to the reviver with
`v(DOMNode, { disabled: false })`. What happens? The reviver must diff the DOM
node and know to call `removeAttribute('disabled')`. Same applies to events and
children, not just attributes. Mutation is hard - just look at the diff
algorithms in virtual DOMs. It's a solved problem, but not this reviver's
problem.

---

You don't need an array for children. In fact, an interesting minimization for
code would be removing them all. Arrays make sense for `.map()`, or functions
and components that return an array of children (yes, you _can_ return an array
of children unlike React/Preact where you need a fragment). You might be
inclined to never use them directly to keep cleaner code, but most editors and
linters will not understand the identation without an array,so you mileage may
vary.

```js
m('#ok', { ... }, anArray.map(item => m('li', item)))
```

And keep in mind just how easy it is find yourself writing nested arrays:

```js
v('#main', [
  v('h1', 'Tags'),
  v('hr'),
  Object.entries(tags).map(([tag, posts]) =>
    v('article', [
      v('h2', { fontStyle: 'italic' }, `#${tag}`),
      posts.forEach(post => v('p', post))
    ])),
])
```

Embracing arrays also has the added benefit of acting like fragments. Basically
replacing them entirely. No one wants to have unnecessary tags. Example:

```js
 v(Layout, [
  PostsModel.list.length > 0
    ?
    PostsModel.list.map((post, index) =>
      v('.list-item', [
        v('.share-box', [
          v(`a.link-btn[href=${post.share.mastodon}]`, 'Mastodon'),
          v(`a.link-btn[href=${post.share.vk}]`, 'VKontakte'),
        ]),
        v(`a[href=/post/${index}]`, v('h3', post.title)),
        v('small', post.author),
        v('p', post.body),
      ]))
    :
    // would have otherwise needed to use a div or fragment here:
    [
      'No posts',
      v('a[href=/post/new]', v('button.primary', 'New post')),
    ],
)]
```

The one time a fragment is still needed is for appending to existing body nodes.
Eventually everything must be mounted, and if voko returns an array of children
to an unsuspecting `node.appendChild(v(...))` then it won't work. To get around
this without additional markup, voko supports `v.fragment(...children)`.

## Component props and JSX compatibility

All libraries have different ways of passing information to components. The
information to convey is usually refered to as `props` but the schema varies.

React-like libraries lump together all DOM attributes, events, component
parameters (such as data), and children into the top level of an object. These
props are merged with default props during rendering. State is not in props,
although Preact does allow for shorthand to access state, props, and context in
their render call (unrelated).

In Mithril, a component receives a vnode from the virtual DOM tree on render. A
vnode is a normal object with keys describing everything about an element. Of
those keys, `attrs`, `state`, and `children` are most comparable to props. The
object `attrs` holds component parameters, DOM attributes, and events. The
import thing to note is that children are seperated and _everything_ in the
virtual DOM tree is accessible to a component.

Mithril:

```js
var Greeter = {
  view: function(vnode) {
    return m('div', vnode.attrs, ['Hello ', vnode.children])
  }
}
var Counter = {
  count: 0,
  view: function(vnode) {
    return m('div',
      m('p', 'Count: ' + vnode.state.count ),
      m('button', {
        onclick: () => { vnode.state.count++ }
      }, 'Increase count')
    )
  }
}
```

Other libraries decided to define an even more seperated schema for props. Val,
from Skate.js, uses top level properties `attr: {}` and `events: {}` to seperate
DOM attribute and events from other top level properties which are treated as
parameters for components. This is good for name conflicts, but means more
objects would need to be written when defining props. It's the least confusing
of all implementations.

In case you're curious, props in Preact are defined as:

```js
type RenderableProps<Props, RefType = any> = Readonly<
  Props & Attributes & { children?: ComponentChildren; ref?: Ref<RefType> }
>;
```

Not dealing with a vitual DOM; I don't have `ref` to consider. But children are
something of interest. In Preact, children are _always_ an array. Which is nice
compared to React, where it's unclear what type children will be. I follow this
as well.

---

What does it mean to be JSX compatible? The lack of a definition becomes an
issue when components props and children are considered. All implementations
pass a single object to a component, either props or a vnode. Here's Preact
adding children to props:

```js
/**
 * Reconstruct Component-style `props` from a VNode.
 * Ensures default/fallback values from `defaultProps`:
 * Own-properties of `defaultProps` not present in `vnode.attributes` are added.
 * @param {import('../vnode').VNode} vnode The VNode to get props for
 * @returns {object} The props to use for this VNode
 */
export function getNodeProps(vnode) {
  let props = extend({}, vnode.attributes);
  props.children = vnode.children;

  let defaultProps = vnode.nodeName.defaultProps;
  if (defaultProps !== undefined) {
    for (let i in defaultProps)
      if (props[i] === undefined) props[i] = defaultProps[i];
  }
  return props;
}
```

So the convention for React-like libraries is to override any children from
attributes with the actual children from the reviver (i.e the arguments after
the selector and attributes).

However, none of this matters because voko is a reviver - so JSX compatibility
only goes as far as having JSX transpile nicely to hyperscript. It has nothing
to do with how components work, or how they communicate.

Components will never be mix and match between libraries. Not without doing a
virtual DOM and component lifecycle which is far beyond a reviver.

## Proposed syntax

```js
v('#main', {
  style: 'font-size: 10px',
}, [
  v('a[href=/][class=link].large', 'Home'),

  // allow a called component (a function) to receive props and attributes
  // since it will return a DOM node which is a valid child
  MyComponent({ size: 50, gridLines: true, class: 'center' }),

  // allow an uncalled component too. the reviver will call pass it both the
  // props, attributes, and children. fully JSX compatible
  v(AnotherComponent, { props, attributes })

  // you could (confusingly) build selectors (strings or functions) using
  // functions. but maybe don't for everyone's sanity:
  v(FunctionThatReturnsSelector(), {})

  v('.btn.primary[disabled]', [
    // not an array of children
    v('p', 'Button'),
    'Text',
    v('small', {
      // it knows what values can have px appended
      // also note that style object properties are natively camelCase
      style: { fontSize: 8, opacity: 0.5 },
      onClick: () => ...
    }, 'Tap me')
  ]),
  // needlessly nested but OK. a document fragment will _not_ be used
  [ 'Text', DOMNode ],
  [[[ 'Text', DOMNode ]]],

  // a document fragment
  v.fragment(1, 2, 3)
])

// append without multiple calls to `appendChild`:
document.body.appendChild(
  v.fragment([
    v('nav'),
    v('main'),
  ])
```
