# voko

Hyperscript reviver for the DOM that uses CSS selector syntax to shorthand
element creation. JSX compatible. For projects where writing raw DOM APIs like
`createElement` is too tedious, but a full framework is too heavy.

1.62kB minified and 939B gzipped when exported as `window.v`. Large projects
will reduce their bundle size after replacing verbose DOM APIs with voko.

Heavily based on Mithril, but also inspired by the hyperscript project, Preact
and other React-like libraries, and Val.

There's no virtual DOM, handling of state or updates, or mutating existing DOM
nodes. It only simplifies DOM APIs for creating elements and fragments, and
allows for HTML components (as functions).

Also works server side with JSDOM to generate HTML.

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
v('.header', { onClick: () => {} }, [
  'Hello',
  v('input[disabled][placeholder=How are you?]', { style: 'padding: 10px' })
])
```

Example of its flexibility, supporting different styles:
```js
const header = v('header', { style: 'background:"#fff"' })
const existingNode = document.createElement('p')

// ES7: https://github.com/tc39/proposal-object-rest-spread
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
minified version to bind to `window` in the browser, and ESM for your bundler.
