// running with Quokka and JSDOM plugin

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

console.log(simpleTest.outerHTML)

const header = v('header', { style: 'background:"#fff"' })
const existingNode = document.createElement('p')

const ButtonComponent = ({ attrs, children }) => {
  // ES7: https://github.com/tc39/proposal-object-rest-spread
  const { size, ...other } = attrs
  return v('a.btn', { style: { fontSize: size }, ...other }, children)
}

const tags = {
  Home: [
    'Some content',
    'Another post',
  ],
  Work: [
    123,
    'Hey!<CODE>Escape</CODE>',
  ],
}
const complexTest =
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

console.log(complexTest.outerHTML)
