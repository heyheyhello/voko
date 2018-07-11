// voko hyperscript reviver. adapted from Mithril and Preact
// this version targets full compatibility with JSX

// matches CSS selectors into a tag, id/classes (via #/.), and attributes
const selectorRegex = /(?:(^|#|\.)([^#\.\[\]]+))|(\[(.+?)(?:\s*=\s*('|'|)((?:\\[''\]]|.)*?)\5)?\])/g
const selectorCache = {}

// numeric CSS properties which shouldn't have 'px' automatically suffixed
// lifted from preact: https://github.com/developit/preact/commit/73947d6abc17967275d9ea690d78e5cf3ef11e37
const styleNoUnit = /acit|ex(?:s|g|n|p|$)|rph|ows|mnc|ntw|ine[ch]|zoo|^ord/i

/**
 * Mithril and Preact support some features and cases that I don't want to:
 *
 * - web-components; pass `is:` attributes into document.createElement
 * - other namespaces; such as SVGs and MathML
 * - updating and removing attibutes if dealing with an existing DOM node
 * - detection of possible parent elements; such as auto creating a table if
 *   using a td inside a div (else the browser removes the td node entirely)
 * - an edge case of input[type=...] on IE 11 needing setAttribute
 * - the spellcheck attribute needs to be handled care for updates and removal
 * - late attributes for select elements; value and selectedIndex can only be
 *   meaningfully set once the node is live
 *
 * I've also decided to not support mutating DOM nodes, which means it's not
 * possible to call a component and have its result passed into the reviver. The
 * only function that can be passed called is to return a selector. Note this is
 * the opposite of what is currently written in the documentation
 */

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
    // otherwise add all children (and nested arrays will become fragments)
  } else {
    // MDN says to not use `.slice()` wth arguments due to optimization issues
    children = []
    while (start < arguments.length) {
      // TODO: better to normalize the tree here? or later in the real loop?
      // need to convert arrays of arrays into document fragments
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

  // TODO: handle event listeners, which need to be done seperately. styles,
  // which needs to support both a string and an object.

  // TODO: if the attribute is one of "href", "list", "form", "width", or
  // "height" (also "type" if supporting IE 11) then it must be added with the
  // setAttribute() DOM API and not to the DOM object in Object.assign()

  Object.assign(state.attrs, attrs)
}
