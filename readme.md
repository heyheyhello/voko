# voko

Hyperscript reviver for the DOM that uses CSS selector syntax to shorthand
element tags and attribute. JSX compatible. Useful for times when a full
framework is too heavy, but using DOM APIs like `createElement` is too tedious.

1.54kB minified and 909B gzipped (when exported via `window.v`)

Heavily influenced by Mithril, but also inspired by other hyperscript projects
such as the original _hyperscript_ project, Preact and other React-like
projects, and Val (Skate.js).

There's no virtual DOM, handling of state or updates, or mutating existing DOM
nodes. It only simplifies the DOM API for creating elements, and allows for HTML
components (as functions).

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
      v('small.bold[style=fontStyle:italic]', {
        className: 'blue',
        onClick() {},
      }, 'Tap me'),
    ]),
    existingNode,
  ]))
```

Read _docs/rationale.md_ on what makes a reviver (and components more generally)
useful, and _docs/scope.md_ for the feature set and design decisions for voko.
