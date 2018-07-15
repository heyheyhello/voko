Issue with what's actually being returned by an invocation of the reviver. I
guess... unlike React/Mithril/etc where you expect the framework to convert your
tree to a virtual DOM and handle mounting it for you, this will need to return
an actual DOM node. Always. This is nice because to get a reference to a DOM
node in a virtual DOM library you need `{ ref={node => this.node = node} }` as
an attribute, but here all you do is `const header = v(...)`

Possible children:
  - __DOM nodes__. Append to the parent.
  - __Arrays__. For each, rerun this possible children algorithm. Yes this has
    the possibility of running away and blowing the call stack, just like
    invoking a component. Doesn't matter.
  - __Objects (including functions)__. Likely an error. Maybe they tried to
    apply attributes in the wrong place? Maybe they forgot to wrap their
    component in `v(...)`. Throw.
  - __Everything else__. Wrapped in a text node and append. This works for
    dates, regex, numbers, and anything that has a `.toString()`

Since this is the DOM, components are static and take care of updating
themselves however they choose to. They'll return a DOM node after being given
props.

There's one hiccup with that, which is trying to create a DOM node using a DOM
node. This would be mutating an existing node and isn't something the reviver
should be responsible for - doing so would mean understanding how to remove and
merge attributes, events, and children. Let's not. This is the same as JSX, but
easier to do by accident in hyperscript due to the syntax:

```js
// voko:
const header = v('header.ok', { ... } ...) // DOM node. not a component
return v('main', [
  v(header, { ... }), // wouldn't make sense, though it looks like a component
  v('p', 'Hello'),
])

// JSX:
const header = <header class='OK'>...</header>
return (
  <main>
    <{header} ... /> // kind of like saying "<<header>>"? bad.
  </main>
)
```

This is probably best avoided by using capitalization for component names as the
communities already do.

In React/Mithril/etc the framework needs to update components as props change,
so `h(MyComponent, {})` (`<MyComponent />`) makes sense because the function
needs to have _not_ been called, so it can be called on each render/lifecycle.

I don't have that.

## Allowed arguments

Selectors can be either a string or function. Not any type of Node. If it's a
function, you call it with the attributes and children and return. Other types,
like DOM nodes, are only valid as children not selectors. Passing off to a
function recursively is very similar to how arrays are handled - the reviver
will simply keep calling/looping.

OK, so that fixes the JSX compatibility issue. Now the reviver can understand
JSX (with a little bit of the usual Babel first). It's common in JSX to set
styles without units and have them know when to default to _px_ (properties like
opacity and flex do not have _px_). This was discussed in an issue thread on
_hyperscript_, and they decided it was too hard to keep track to which
properties it applies. However, Preact has a nice regex to check, which I've
lifted to voko.

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
    {style: "invalid-prop:1;font:12px/1.1 arial,sans-serif;", icon: true},
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

The Mithril author makes it sound like the reviver/renderer would need a very
long list of if statements to check all attribute edge cases, but actually it's
as easy as `attr in node ? node[attr] = ... : node.setAttribute(attr, ...)`.

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

Considered accepting a DOM node in previous versions. Not that I was expecting
to write anything like `v(v(v('div')))`, but it meant you can add attributes and
children to an existing DOM node, which is neat. An example might be:
`v($('.findMe'), { onClick: () => {} })`. However, I was reminded that a reviver
does not mutate anything. Accepting an attached DOM node is kinda...hmm; as
someone in a _hyperscript_ issue thread wrote:

> When using, designing and documenting APIs for things [...] it’s good when one
> function returns a value or mutates things. But not both at the same time.

Not handling that also means reducing code complexity. Imagine a DOM node
already has an attribute `disabled: true`, and you pass it to the reviver with
`v(DOMNode, { disabled: false })`. What happens? Should it diff and then call
`removeAttribute('disabled')`? Kinda needs to. Same goes for events and
children, not just attributes. Mutation is hard - just look at the diff
algorithms in virtual DOMs. It's a solved problem, but not this reviver's
problem.

---

You don't need to use an for children. In fact, an interesting minimization for
code would be removing them all. Arrays make sense for `.map()`, or functions
and components that return an array of children (yes,you _can_ return an array
of children unlike React/Preact). You might be inclined to never use them
directly to keep cleaner code, but most editors and linters will not understand
the identation without an array,so you mileage may vary.

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
])
```
