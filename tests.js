const simpleTest =
  v('header.ok[href=link][class=yes]', {
    class: 'blue',
    className: 'primary',
    style: { fontSize: 10 },
    onClick: () => {},
  }, [
    'HI',
    'Link',
    [1, 2, 3].map(x => v('li', x))
  ])

// expect order to be mainted for children
console.log(simpleTest.outerHTML)

const header = v('header', { style: 'background:"#fff"' })
const existingNode = document.createElement('p')

existingNode.appendChild(
  v.fragment([
    v('', 'Hello'),
    v('h1')
  ]))

existingNode.appendChild(
  v.fragment(v('.one', 1), v('.two', 2)))

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

const condition = false

// store references to live DOM nodes
const live = {}

const complexTest =
  v('#main', [
    condition &&
      v('nav.large', [
        v('a.link[href=/][disabled]', 'SHOULD NOT RENDER'),
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
    v(ButtonComponent, {
      ref: e => live.Button = e,
      size: 50,
      class: 'center'
    }, 'Child 1', 2, 3, 4),
    v('section.primary', [
      'Text',
      v('p', 'Hello'),
      v('small.bold[style=fontStyle:italic]', {
        ref: e => live.Tap = e,
        className: 'blue',
        onClick() {
          console.log('onClick')
        },
      }, 'Tap me'),
    ]),
    existingNode,
  ])

console.log(complexTest.outerHTML)

// expect `{ Button: HTMLAnchorElement {}, Tap: HTMLElement {} }`
console.log(live)

// expect `{ click: [λ: onClick] }`
console.log(v.events.get(live.Tap))

// testing SVGs; similar to:
// https://gitlab.com/nthm/snakoa/blob/e473ed194f2eacc2ee4868ef9c4a66f7925cf97a/grid.js

function createSVGBaseGrid({
  squareSize = 50, // In pixels
  width = 10,
  height = 10,
} = {}) {
  const size = squareSize;
  const pxWidth = width * size;
  const pxHeight = height * size;
  // can't [viewBox=] since the array will be coerced to a string
  // can't [width=][height=]
  const svg = v(`svg:svg#grid`, {
    ref: e => {
      e.setAttribute('width', pxWidth)
      e.setAttribute('height', pxHeight)
      e.setAttribute('viewBox', [0, 0, `${pxWidth} ${pxHeight}`])
    },
  })
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // can't [transform=] since the array will be coerced to a string
      const group = v('g:svg', {
        ref: e => {
          e.setAttribute('transform', [`translate(${x * size},${y * size})`])
        },
      }, [
        // can't [width=][height=]
        v('rect:svg[fill=#fff][stroke-width=1][stroke=#ccc]', {
          ref: e => {
            e.setAttribute('width', size)
            e.setAttribute('height', size)
          },
          onMouseOver: event => {
            event.target.setAttribute('fill', '#ddd')
          },
          onMouseOut: event => {
            event.target.setAttribute('fill', '#fff')
          },
        }),
        // can't [x=][y=]
        v('text:svg', {
          ref: e => {
            e.setAttribute('x', 5)
            e.setAttribute('y', 15)
          },
          // not really working either... it's in the {} but needs setAttribute
          fontSize: 10,
          fontFamily: 'monospace',
        }, `(${x},${y})`)
      ])
      svg.appendChild(group)
    }
  }
  return svg
}

console.log(createSVGBaseGrid())
