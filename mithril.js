// modification to hyperscript reviver used in Mithril.js
// simplified to help understanding

const selectorRegex = /(?:(^|#|\.)([^#\.\[\]]+))|(\[(.+?)(?:\s*=\s*('|'|)((?:\\[''\]]|.)*?)\5)?\])/g
const selectorCache = {}

// parse a selector into a tag (defaults to div) and a series of attributes
function parseSelector(selector) {
  let match, tag = 'div'
  const classes = [], attrs = {}
  while (match = selectorRegex.exec(selector)) {
    const type = match[1], value = match[2]
    if (type === '' && value !== '') tag = value
    else if (type === '#') attrs.id = value
    else if (type === '.') classes.push(value)
    else if (match[3][0] === '[') {
      let attrValue = match[6]
      if (attrValue) attrValue = attrValue.replace(/\\([''])/g, '$1').replace(/\\\\/g, '\\')
      if (match[4] === 'class') classes.push(attrValue)
      else attrs[match[4]] = attrValue === '' ? attrValue : attrValue || true
    }
  }
  if (classes.length > 0) attrs.className = classes.join(' ')
  return selectorCache[selector] = { tag, attrs }
}

export function h(selector) {
  if (!selector || typeof selector !== 'string' && typeof selector !== 'function') {
    throw Error('selector is not a string or component')
  }
  const attrs = arguments[1] || {}
  let start = 2, children
  // if attrs looks like a child, or list of children, assume none were passed
  if (typeof attrs !== 'object' || attrs.tag != null || Array.isArray(attrs)) {
    start = 1
  }
  // support receiving one child that's actually an array of many children
  if (arguments.length === start + 1) {
    children = arguments[start]
    if (!Array.isArray(children)) {
      children = [children]
    }
  // otherwise add all children. note this means we do not support multiple
  // arrays of children, only one or none
  } else {
    // MDN says to not use `.slice()` wth arguments due to optimization issues
    children = []
    while (start < arguments.length) {
      children.push(arguments[start++])
    }
  }
  if (typeof selector !== 'string') {
    // component is a function, let it do it's own rendering
    // TODO:
    return Vnode(selector, attrs.key, attrs, children)
  }

  // state is a tag and attributes (class, id, etc) derived from the selector
  const state = selectorCache[selector] || parseSelector(selector)

  // attrs will be merged into state's attributes, overwriting everything except
  // class or className which stacks. use className to follow DOM API convention
  state.attrs.className =
    [state.attrs.className, attrs.class, attrs.className]
      .filter(Boolean)
      .join(' ')

  // the class is set, so delete them to avoid overwriting in Object.assign()
  // it's safe to delete attributes that don't exist
  delete attrs.class
  delete attrs.className
  Object.assign(state.attrs, attrs)

  // TODO: build the DOM, set event listeners, and assign everything else over
}
