# Hyperscript revivers

Utility providing a shorthand way of producing HTML DOM trees. The parser is JSX
compatible, but far more powerful without it by allow CSS selector syntax to
define element tags. Useful for times when a full framework is too heavy, but
using DOM APIs like `createElement` is too tedious.

1.56kB minified and 961B gzipped (when exported via `window.v`)

---

This reviver was heavily influenced by Mithril, but also inspired by other
hyperscript projects such as the original _hyperscript_ project, JSX, vhtml, the
reviver's in Preact and other React-like projects, and Val (from Skate.js)

There's no virtual DOM or handling of state or updates. It only simplifies the
DOM API allowing for HTML components without a framework.

Turns:

```js
const header = document.createElement('div')
header.className = 'header'
header.addEventListener('click', () => {})

const text = document.createTextNode('Hello')
header.appendChild(text)

const input = document.createElement('input')
input.style = 'padding: 10px'
input.setAttribute('disabled', true)
input.setAttribute('placeholder', 'How are you?')

header.appendChild(input)
```

Into:

```js
v('.header', { onClick: () => {} },
  'Hello',
  v('input[disabled][placeholder=How are you?]', { style: 'padding: 10px' })
)
```

The reviver also supports components (as functions) and transpiled JSX code.
See other examples in this document.

## Rational

I introduced my team at work to React (though I now use Preact) and the idea of
component oriented design that to write HTML directly in JS. We've experienced
several benefits from that workflow, but I still wouldn't use React (or any
large framework) for my personal projects. I like to keep things minimal. You
don't need a framework for every project, and sometimes they can be very heavy
to carry for a small project. I use webpack to bundle JS, CSS, images, SVGs, and
fonts. The only missing part is how to handle HTML. That's really what all this
is about: figuring out how to nicely have HTML in JS.

## Targeted projects

It's hard to define at what point a project should use a large framework, but I
tend to think about re-rendering. If the UI of a project is very dynamic or
works alongside live features like notifications or websockets then it's likely
best to use a framework. A virtual DOM, diffing, and component reuse will be
important for performance, and I'd absolutely wouldn't recommend taking it on
alone.

In smaller projects, however, such as my personal projects. I often find myself
building up a UI and never tearing it down. DOM nodes are created and mounted,
perhaps classes are toggled to show/hide or open/close various pieces of the
application, but the DOM tree is static. This research and hyperscript reviver
is targeting that kind of project.

## The problem of merging markup and data

This need to bring HTML into JS is actually more about the need to bring markup
into data. It's about minimizing how data looses meaning as it's passed between
parts of a system. Every interface is a risk - ever played telephone as a kid?
I'll illustrate by first talking about the issue for servers, then return to
the client side.

### Servers

Servers sometimes handle the frontend in the backend. It's not unreasonable to
do traditional HTML generation. You might be able to get away with string
concatenation for small projects, but you'll likely use a template engine. An
example would be Express with EJS or Jade (Pug). This is a great way to approach
HTML, as the engines provide features like includes and mixins, which is similar
to components. However, they still fall short in two areas:

1) They're still fundementally disconnected from the data. You need to pass data
   to the engine (sometimes a complety seperate process) via calls to `render()`
   which means you need to define yet another interface to passing around data.

   If you open a Jade file without knowing the server code that calls it, you
   have no idea what's going on. Where are these variables coming from? Who's
   calling this template? Is this data from a database? Is it modified first?

2) The engines are server side, so you'll now also have the issue again once you
   get to the frontend. It might be great for clients without JS enabled (yes,
   you should be supporting them; SSR is always easy) but it means JS will need
   to find any important DOM nodes all over again, which is yet another
   interface: a list of classes and ids to maintain in each code base.

Everything in programming has an API, whether it's a `.toString()` method or a
database schema. I'm not saying they're bad or need to be avoided, just that
some APIs lose meaning when they cross certain boundaries - your editor will not
be able to autocomplete your APIs across languages (at least, not without a lot
of work; I'm sure people get it to happen somehow) and it will hurt other
contributors and your future self.

### Browsers

In component based applications, you usually use HtmlWebpackPlugin to generate a
very basic HTML page with the right link and script tags. Then leave the rest to
the components that are mounted. This is to avoid having HTML seperated from the
rest of a component's definition which leads to confusion about how it's used
and depended on, and how it's wired up. Often, frameworkless projects with a
seperation of HTML from JS will use `document.querySelector` to find DOM nodes
and hydrate them with content or event listeners. This works, but can be messy
and lead to a mess of wiring.

## Components

They're not required for a web application, but they make sense. It's best to
minimize the inputs and outputs of each part of the program - you do it
everytime you write a closure, function, scope, or class - there's no reason for
a web application to be written as a tangled mess of wiring for the UI markup,
styles, and the code.

There are several approaches to this, but most revolve around using state to
modify a declarativly written UI from within the code; not seperated from it.
The first framework I used was React, and it uses JSX to write HTML in JS. You
can also write styles in JS too, but in the same way that it's not necessary to
use components for very small projects, in medium-sized projects it's usually
enough to just import CSS to the component file and resolve namespaces manually.

## Options

The community has some options to help merge markup and data. Let's look at the
options for vanilla JS, how it's handled in some React-like frameworks (discuss
why some people choose to not use them) and then look at some architectures of
nearly vanilla JS components.

I have no experience with Vue.js, Polymer (although I do know web-components),
or Angular. Who knows, maybe they've solve it.

### Vanilla JS

The available out of the box options for HTML in JS are string concatenation (or
array joining), template literals, and vanilla DOM APIs to build HTML in JS.

I won't talk about the first one, so let's look at template literals. Some
frameworks like hyperHTML and lit-html are built on this concept, and it allows
to seamlessly interweave data and markup - which is great! However, it has
issues with minification (every newline is preserved) and offers limited editor
syntax highlighting since everything is a string. You also need to dangerously
use `.innerHTML` at some point, which is far slower relative to vanilla DOM APIs
(of course it's fast _enough_ and negligible in the long run).

Vanilla DOM APIs, as shown in the opening example, can be very tedious and
Still, they work, and are what I'm used to using for all personal projects.

### React / Preact / Mithril

These are all virtual DOM frameworks that use JSX/hyperscript to produce virtual
DOM trees and then render the real DOM. JSX/hyperscript is _the_ solution for
HTML in JS, and is loved by lots of people. However, to use it you need the full
framework - you can't just have HTML in JS. Frameworks are great to ease
development time and stress, and for large projects it's worth it. But for small
projects the sizes of frameworks can be off putting. Note I'm not measuring gzip
sizes since it's good to consider the parse time of the scripts as well:

- React is 100-200kb minimum . A standard small React application is 500kb which
  can be hard to swallow, and needs to be compiled which takes about 20 seconds
  on my quad core machine (using create-react-app which uses thread-loader to
  parallelize the webpack build)

- Preact (usually a drop in replacement for React) weighs in at only 8kb, so I
  can actually see my code in a bundle analysis. It also has a small enough code
  base to read it in one sitting, and it's easy to understand how it works
  (maybe with the exception of the diffing algorithm).

- Mithril is nice because it skips JSX and recommends just writing hyperscript
  since it's reviver allows for a more terse syntax. It's the inspiration for
  everything I'm doing now, but I'm not interesting in its router, XHR wrapper,
  and all similarities with React/Preact (mentioned below).

Regardless of size, sometimes the extra complexity of a virtual DOM, component
lifecycle surrounding state, and the need to compile (for JSX) is overkill. If
you only want components do you need to use carry all of that?

### lit-html/hyperHTML

These two libraries don't use JSX, and don't need to be compiled. They happen to
have some intense politics between who invented what and where credit is due,
but otherwise they're each just wrapping the previously mentioned issues with
template literals. They're also rather large and have bad browser support; it's
25kb minified for lit-html and they will not support webpack or anything other
than ES modules (Chrome 61+). The team for lit-html says the API may change and
it's not ready.

## Vanilla components

You don't need to use a framework. Unfortunately there's very little
documentation on this, but I've two people have taken on the challenge with good
results.

Here's a neat implementation/architecture by someone who wanted frameworkless
components for a Leaflet Game of Thrones map:

https://blog.patricktriest.com/game-of-thrones-leaflet-webpack/

He defined a component as a class connecting files for HTML, CSS, and JS. The
HTML file will use `ref` attributes (similar to `<slot>` tags of web-components,
but slots aren't well supported). Then during webpack build, the HTML/CSS is
minified and loaded into JS as a string through the html-loader. A `Component`
class that all other classes extend from has methods to find all `ref` tags and
attach data and event listeners to them. It uses `innerHTML` to inject the HTML
"template" (it's a string of HTML held in JS, not a `<template>` tag) into an
existing DOM node.

Here's an example using refs:

Note the `ref`s
```html
<div ref="container" class="info-container">
  <div ref="title" class="info-title">
    <h1>Nothing Selected</h1>
  </div>
  <div class="info-body">
    <div class="info-content-container">
      <div ref="content" class="info-content"></div>
    </div>
  </div>
</div>
```

This is a really nice job! It's still wiring, but at least the HTML is broken up
into a file per component and things are kept close by.

TODO: Mention the author of knowitall and vanillaJS:
https://hackernoon.com/10-things-i-learned-making-the-fastest-site-in-the-world-18a0e1cdf4a7
https://hackernoon.com/how-i-converted-my-react-app-to-vanillajs-and-whether-or-not-it-was-a-terrible-idea-4b14b1b2faff

## Hyperscript

Hyperscript has been around for a few years. I heard of it from Preact, as the
author gives credit to the original _hyperscript_ project by using `h` as an
import and pragma for JSX. Still, Preact uses and recommends JSX just like
React, and many people who use JSX don't know that it's only syntactic sugar for
hyperscript. Babel turns JSX into hyperscript, and the `h` function, called a
"reviver" creates a tree - usually a virtual DOM.

More recently while discovering Mithril, which is a React-like framework that
recommends its implementation of hyperscript instead of JSX, did I see how terse
hyperscript can be on it's own.

This is the general syntax for hyperscript:

`pragma('tag', { ...attrs, children }, /* or children */)`

However, Mithril takes an extra step by extending their hyperscript reviver
(which is JSX compatible) to use CSS-like selectors for shorthanding markup
creation like this:

`m('#hello.grey[disabled][href=/]', { ... }, 'Hello!')`

Which is very terse and gets a lot done. Espescially since attributes can define
event listeners like `{ onclick: () => ..., }` which internally just grabs any
`/on\W+/` and tosses it in an `addEventListener()`.

As previously mentioned during framework comparison, Mithril uses a virtual DOM,
and its reviver does not touch the DOM directly. Luckily there are many other
hyperscript implementations to consider.

The original _hyperscript_ project itself (very old code) demonstates how to
work with the DOM to create real elements, add attributes, styles, and even link
events. They also show how to keep track of created event listeners to allow for
a way of cleaning up when "unmounting". It supports `#` and `.` as "extended"
tags.

Another similar project is vhtml, which is made by the people at Preact. It
supplies "sort of components" by having the reviver (which supports for `#` and
`.` like _hyperscript_, but not as featureful as Mithril) create HTML strings
which can later be `innerHTML`'d. The readme.md also shows how to connect
components and pass in props.

Preact's source code for `h()` (its pragma) is similar, being a sister project,
and provides some insight on how to build an efficient interpreter.

Nothing provides a way to create DOM content using CSS selector shorthand like
Mithril without a virtual DOM, and with a goal of components like vhtml.

Skate.js has _Val_ which is a virtual DOM abstraction hypervisor that plugs into
React and Preact virtual DOMs and the real DOM. It seperates attributes, events,
and props into `{ attrs: {}, events: {}, ...props }` and mentions that the way
Preact, Mithril, and this reviver use `attr in DOMNode` might not be compatible
with web-components. That's OK for now.

I've started writing in _notes.md_ to decide what syntax it will support.

Proposed syntax:

```js
const header = v('header', { style: 'background:"#fff"' })
const existingNode = document.querySelector('#existing')

const ButtonComponent = ({ attrs, children }) => {
  // ES7: https://github.com/tc39/proposal-object-rest-spread
  const { size, ...other } = attrs
  return v('a.btn', { style: { fontSize: size }, ...other }, children)
}

v('#main', [
  v('nav.large', [
    v('a.link[href=/][disabled]', 'Home'),
  ]),
  header,
  v('h1', 'Tags'),
  v('hr'),
  Object.entries(tags).map(([tag, posts]) =>
    v('article', [
      v('h2', { style: { fontSize: 18 } }, `#${tag}`),
      v('small', `Post count: ${posts.length}`),
      posts.forEach(post => v('p', post)),
    ])),
  v(ButtonComponent, { size: 50, class: 'center' }, 'TapTap'),
  v('section.primary', [
    'Text',
    v('p', 'Hello'),
    v('small.bold[style=fontStyle:italic]', {
      className: 'blue',
      onClick() {},
    }, 'Tap me'),
  ]),
  existingNode,
])
```
