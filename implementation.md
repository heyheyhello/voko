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
JSX (with a little bit of the usual Babel first).

Why accept a DOM node? Do I see myself writing `v(v(v('div')))`? No, but it does
mean you can add attributes and children to an existing DOM node, which is neat.

## Proposed syntax

```js
v('#main', [
  v('a[href=/][class=link].large', 'Home'),

  // allow a called component (a function) to receive props and attributes
  // since it will return a DOM node which is a valid child
  MyComponent({ size: 50, gridLines: true, class: 'center' }),

  // allow an uncalled component too. the reviver will call pass it both the
  // props, attributes, and children. this is for JSX compatibility
  v(AnotherComponent, { props, attributes })

  // allow a DOM node (a component that was called with props), and then modify
  // the node with attributes and children. it's too late for any props
  v(MyComponent({ size: 25 }), { attributes }, 'Appended text!')
  v(document.createElement('p'), { attributes }, 'This is OK too if you need')

  // while allowed, avoid using a function to return a selector since it looks
  // like a component and will confuse people who read your code
  v(ConfusingFunctionThatReturnsSelector(), {})

  v('.btn.primary[disabled]',
    // not an array of children
    v('p', 'Button'),
    'Text',
    v('small', {
      style: { ... },
      onclick: () => ...
    }, 'Tap me')
  ),
  // document fragment containing a text node and a DOM node
  [ 'Text', DOMNode ],
])
```