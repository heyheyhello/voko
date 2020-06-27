# voko

_Done. This project is maintained but there's no more development needed_

Hyperscript reviver that uses CSS selector syntax to shorthand element creation.
Supports DOM and SVGs. JSX compatible.

1.72kB minified and exactly **1000B gzipped** when exported as `window.v`.
Reduce your bundle size by replacing verbose DOM APIs with voko.

## Intro

```js
v('.header', { onClick: () => {} }, [
  'Hello',
  v('input[disabled][placeholder=How are you?]', { style: 'padding: 10px' }),
])
```

Replaces:

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

Heavily based on Mithril, but also inspired by the hyperscript project, Preact
and other React-like libraries, and Val.

## Scope

There's no virtual DOM, handling of state or updates, or mutating existing DOM
nodes. It only simplifies DOM APIs for _creating_ elements and fragments. Allows
for HTML components as functions. JSX compatible so drop it into any React-like
projects.

I wrote this for my co-workers who were writing all DOM API calls by hand in a
very messy and unmaintainable way (sorry but you know it's true). This is meant
to be dropped into a `<script>` tag to be plug-and-play.

## SVGs/Namespaces

There are many nuances to writing namespaced elements like SVGs and MathML. DOM
APIs like `svgTextEl.x = 10` won't work as expected. They need methods which are
namespaced like `setAttribute()`.

`document.createElement()` won't work since it'll be namespaced to XHTML.

Here's some standard JS for creating SVGs:

```js
document.createSVG = tag =>
  document.createElementNS('http://www.w3.org/2000/svg', tag)

const size = 30
const svg = document.createSVG('svg')
svg.setAttribute('viewBox', [0, 0, '100 100']);

const box = document.createSVG('rect')
box.setAttribute('width', size)
box.setAttribute('height', size)
box.setAttribute('fill', '#fff')
box.addEventListener('mouseover', event => {
  event.target.setAttribute('fill', '#ddd')
})

svg.appendChild(box)
```

In voko, you'd write them as expected. Use `:` to denote the namespace. In this
case, `:svg`. Replace the above code with:

```js
const size = 30
v('svg:svg[viewBox="0 0 100 100"]', [
  v(`rect:svg[fill=#fff][width=${size}][height=${size}]#nice-icon`, {
    onMouseOver: event => { event.target.setAttribute('fill', '#ddd') },
  }),
]),
```

Add arbitrary namespaces such as MathML by adding them to the `v.ns` object.
Only SVG is included by default. You can rename namespaces too, if you're into
that: `v.ns.s = v.ns.svg`

## Examples

Example of its flexibility, supporting different writing styles for attributes,
CSS-style syntax, and looping:

```js
const header = v('header', { style: 'background:"#fff"' })
const existingNode = document.createElement('p')

const ButtonComponent = ({ size, ...other }, children) =>
  v('a.btn', { style: { fontSize: size }, ...other }, children)

const tags = {
  Pictures: [
    'Some content',
    'Another post',
  ],
  Videos: [
    'Hello! <code>Escaped HTML</code>',
    123,
  ],
}

// track references to DOM nodes using `ref:`
const live = {}

document.body.appendChild(
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
        posts.map(post => v('p', post)),
      ])),
    v(ButtonComponent, { size: 50, class: 'center' }, 'TapTap', 'Tap'),
    v('section.primary', [
      'Text',
      v('p', 'Hello'),
      v('small.btn[style=fontStyle:italic]', {
        ref: e => live.Button = e,
        className: 'blue',
        onClick() {},
      }, 'Tap me'),
    ]),
    existingNode,
  ]))

// expect `{ Button: HTMLElement {} }`
console.log(live)

// expect `{ click: [λ: onClick] }`
console.log(v.events.get(live.Button))

// append without extra tags or calls to `appendChild`:
document
  .querySelector('content #card')
  .appendChild(
    v.fragment(v('nav'), v('main'))
```

Read _docs/rationale.md_ on what makes a reviver (and components more generally)
useful, and _docs/scope.md_ for the feature set and design decisions for voko.

__Note__: This is a purely ESM script, so it won't support `require()`. Use the
minified version to bind to `window` in the browser, and ESM for your bundler or
on Pika/Snowpack
