## Arguments

Hyperscript revivers parse arguments in different ways regardless if they're
building a DOM, a virtual DOM, or HTML strings.

The tree below shows a combination of styles for writing hyperscript supporting
attributes in the tag and optionally as an object, and children as an array or
list of arguments.

```js
h('#main', [
  // allow merging classes in the tag with those in attributes
  h('a[href=/][class=link].large', { class: 'bold center' }, 'Home'),
  // allow a component (a function) to receive props and attributes
  h(MyComponent, { size: 50, gridLines: true, class: 'center' }),
  h('.btn.primary[disabled]',
    // not an array of children
    h('p', 'Button'),
    'Text',
    h('small', {
      style: { ... },
      className: 'blue'
      onclick: () => ...
    }, 'Tap me')
  ),
  // document fragment containing a text node and a DOM node
  h('[', [ 'Text', DOMNode ]),
])
```

The allowed syntax varies by implementation. The example maintains an order of
arguments `tag, attributes?, children?` but not all revivers require that.

Some implementations require all childrent to be DOM nodes, and maybe not
automatically use `document.createTextNode`. Text would then need to be passed
via attributes `.textContent`/`.innerText` or a special tag like `h('#',
'Hello')`).

The _hyperscript_ project decided to handle arguments as loosly as possible by
making decisions based on their type and whether or not things like tags have
been found yet. This which allows for any order and supports duplicate
attributes interveled with children. It's possible that API is nicer to use?
However it's very unconventional and might cause more harm than good. Also, the
lack of structure means the code needs to parse all arguments before knowing for
sure that it can't continue if it was never given a tag or component function.
Algorithms that expect a structure will know immediately.

An unusual structure that is still valid in _hyperscript_:

```js
h({ id: 'hello' }, [
  h(ChildComponent)
], '#ignoredId.red', 'Some text', { class: 'bold' })
```

Equivalent to:
```
<div id='hello' class='red bold'>
  <ChildComponent ... >
  Some text
</div>
```

There's tradeoffs to every approach, but the format of `tag, attributes?,
children?` is not a lot to ask for and is likely expected by developers at this
point. It may be best to not allow confusing syntax from the start. Mithril and
Preact each expect that argument order to be able to handle JSX. Preact,
following React, expects you to write in JSX so it requires the attribute
parameter since Babel always transpile to include it. Mithril however, supports
JSX but doesn't expect developers to use it so it's more flexible and treats
attributes as an optional second parameter.

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
    return Vnode("[", undefined, undefined, Vnode.normalizeChildren(node), undefined, undefined)
  if (node != null && typeof node !== "object")
    return Vnode("#", undefined, undefined, node === false ? "" : node, undefined, undefined)
	return node
}

Vnode.normalizeChildren = input => input.map(Vnode.normalize)
```

## Case sensitivity of DOM events

Because attributes are often merged into a DOM node's properties, it makes sense
to have functions like `onclick` be lowercase as object properties are case
sensitive and always lowercase. However, I agree that it's more readable to use
a JSX/React like `onClick` syntax instead. In Inferno, which also uses JSX, the
process of normalizing event names is as simple as it sounds:

From _inferno/src/DOM/events/delegation.ts_

```js
function normalizeEventName(name) {
  return name.substr(2).toLowerCase();
}
```
