Issue with what's actually being returned by an invocation of the reviver. I
guess... unlike React/Mithril/etc where you expect the framework to convert your
tree to a virtual DOM and handle mounting it for you, this will need to return
an actual DOM node. Always. This is nice because to get a reference to a DOM
node in a virtual DOM library you need `{ ref={node => this.node = node} }` as
an attribute, but here all you do is `const header = h(...)`

I believe the reviver will only ever receive two types of children. DOM nodes to
be appended to the parent, and everything else that's wrapped in a text node and
then treated as DOM nodes. Components are static and take care of themselves
updating however they choose to. So they'll return a DOM node after being given
props. The issue with that is `v(MyComponent, {})` or anything that's not
`v('selector as string')` doesn't make sense. It's like saying "create a DOM
node with this DOM node". Is that OK?

In React/Mithril/etc the framework needs to update components as props change,
so `h(MyComponent, {})` (`<MyComponent />`) makes sense because the function
needs to have _not_ been called, so it can be called on each render/lifecycle.

I don't have that.

I could disallow a selector from being anything other than a string, but I break
JSX compatibility, and it looks...different.

## Allowed arguments

A safe thing to do is accept either a string, function, or DOM node (like
`instanceof HTMLElement`, not a fragment or text node) as the first parameter.
If it's a function, you call it and then assume it has returned a DOM node. This
means you can't pass a function expecting it to be called and return a selector,
but for that just do `v(generateSelector(), {})`. Also, it doesn't allow
recursion on purpose. It's easy to say, oh look, a function, I'll just call it
and pass it's output back to myself (which is what many implementations do) but
I imagine being passed the fibonachi sequence and blowing the call stack.
Granted, components should never need to be called multiple times (why would
they be nested?), but in the super rare case that it's necessary, I'd rather
force the developer to write a wrapper to de-recurse their weird component than
have the reviver do that job.

OK, so that fixes the JSX compatibility issue. Now the reviver can understand
JSX (with a little bit of the usual Babel first). Note this _still_ isn't
perfect as it's common in JSX to set styles without units, and have them know
when to default to _px_.

The tl;dr is that it's hard to know what properties are unitless. There are
entire repositories keeping track of values like `opacity`.

Mithril has some test cases on CSS:

```js
m("button-bar",
  m("button",
    {style: "width:10px; height:10px; border:1px solid #FFF;"},
    "Normal CSS"
  ),
  m("button",
    {style: "top:0 ; right: 20"},
    "Poor CSS"
  ),
  m("button",
    {style: "invalid-prop:1;padding:1px;font:12px/1.1 arial,sans-serif;", icon: true},
    "Poorer CSS"
  ),
  m("button",
    {style: {margin: 0, padding: "10px", overflow: "visible"}},
    "Object CSS"
  )
)
```

There's a long thread about the API of hyperscript, which is what I'm dealing
with now...
https://github.com/hyperhype/hyperscript/issues/66

Some libraries take a `props` object that defines _both_ `events` and `attrs` to
allow for regex-less event listener names. Others allow namespacing for XML!
Another uses `hooks` like `beforeRevomal` to aid in transitions...wew.

The Mithril author chimed in at the end of issue #66 and lays down some great
points: JSX compatibility should be prioritized - some people will never want to
write in hyperscript directly and that's just the way it is. Next, try to
support the existing HTML and JS APIs. He also mentions variations in those:

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

---

I'd like to be Mithril compatible, which is therefore also JSX compatible. Then
I'll also write a small version for projects that are only for _you_ and don't
need compatibility with anything.

Compatibility also extends to web-components. Some libraries spend a great
amount of code ensuring they're properly supported. The `is` attribute must be
taken out (like events are) from other attributes and

```js
document.createElement('div', { is: 'my-list-item' })
```

---

Why accept a DOM node? Do I see myself writing `v(v(v('div')))`? No, but it does
mean you can add attributes and children to an existing DOM node, which is neat.
This would be done through `v($('.findMe'), { onClick: () => {} })`

**However** should the reviver not mutate things? Accepting an attached DOM node
is kinda...hmm. As someone in a _hyperscript_ issue thread wrote:

> When using, designing and documenting APIs for things [...] it’s good when one
> function returns a value or mutates things. But not both at the same time.

Also, imagine a DOM node already has an attribute `disabled: true`, and you pass
it to the reviver with `v(DOMNode, { disabled: false })`. Does it diff, and then
call `removeAttribute('disabled')`? Not currently, but some implementations do
and maybe for good reason?

---

~~Update on arrays as children; don't advise the use of an array. It's only
meant for cases like:~~ No, actually. It's meant for indentation! Editors and
linters will not understand otherwise. Use arrays at the top level! Nested
arrays are only for cases like:

```js
m('#ok', { ... }, anArray.map(item => m('li', item)))
```

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
  // props, attributes, and children. this is for JSX compatibility
  v(AnotherComponent, { props, attributes })

  // the only type of function as a selector is one that returns a selector
  v(FunctionThatReturnsSelector(), {})

  v('.btn.primary[disabled]', [
    // not an array of children
    v('p', 'Button'),
    'Text',
    v('small', {
      // it knows what values can have px appended
      // also note that style object properties are natively camelCase
      style: { fontSize: 8, opacity: 0.5 },
      onclick: () => ...
    }, 'Tap me')
  ]),

  // needlessly nested but OK. no document fragment will be used
  [ 'Text', DOMNode ],
])
```