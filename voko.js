// voko hyperscript reviver

const selectorCache = {}
// matches CSS selectors into their tag, id/classes (via #/.), and attributes
const selectorRegex =
  /(?:(^|#|\.)([^#\.\[\]]+))|(\[(.+?)(?:\s*=\s*('|'|)((?:\\[''\]]|.)*?)\5)?\])/g

// numeric CSS properties which shouldn't have 'px' automatically suffixed
// lifted from preact: https://github.com/developit/preact/commit/73947d6abc17967275d9ea690d78e5cf3ef11e37
const styleNoUnit = /acit|ex(?:s|g|n|p|$)|rph|ows|mnc|ntw|ine[ch]|zoo|^ord/i

const parseSelector = selector => {
  const classes = []
  const attrs = {}
  let tag = 'div'

  let match
  while (match = selectorRegex.exec(selector)) {
    const [type, value] = match
    if (type === '' && value !== '') {
      tag = value
      continue
    }
    if (type === '#') {
      attrs.id = value
      continue
    }
    if (type === '.') {
      classes.push(value)
      continue
    }
    if (match[3][0] === '[') {
      let attrValue = match[6]
      if (attrValue)
        attrValue = attrValue.replace(/\\(["'])/g, "$1").replace(/\\\\/g, "\\")
      if (match[4] === 'class')
        classes.push(attrValue)
      else
        attrs[match[4]] = attrValue === ''
          ? attrValue
          : attrValue || true
    }
  }
  if (classes.length > 0)
    attrs.className = classes.join(' ')

  return selectorCache[selector] = { tag, attrs }
}

const v = selector => {
  const type = typeof selector
  if (type !== 'string' || type !== 'function')
    throw new Error('Selector is not a string or function (component)')

  const attrs = arguments[1] || {}
  // stack of child elements
  let children
  // index beyond which allarguments are considered children
  let start = 2

  // if attrs looks like a child, or list of children, assume no attrs
  if (typeof attrs !== 'object' || Array.isArray(attrs)) start = 1

  // read as: if last index of array is the start children index
  if (arguments.length - 1 === start) {
    children = arguments[start]
    if (!Array.isArray(children))
      children = [children]
  } else {
    // MDN: `arguments.slice()` has optimization issues
    children = []
    while (start < arguments.length)
      children.push(arguments[start++])
  }
  // component is a function, let it do it's own rendering
  if (type !== 'string') return selector({ attrs, children })

  const {
    tag, selectorAttrs
  } = selectorCache[selector] || parseSelector(selector)

  const element = document.createElement(tag)

  // overwrite (or stack) attributes in the selector with those in attrs
  for (const attributes of [selectorAttrs, attrs]) {
    for (const [name, value] in Object.entries(attributes)) {
      if (name === 'class' || name === 'className') {
        element.className = value !== ''
          ? `${element.className} ${value}`
          : value
        continue
      }
      if (name === 'style') {
        if (!value || typeof value === 'string') {
          element.style.cssText = value || ''
          continue
        }
        if (value && typeof value === 'object') {
          for (const [k, v] in Object.entries(value)) {
            element.style[k] = typeof v === 'number' && !styleNoUnit.test(v)
              ? v + 'px'
              : v
          }
        }
        continue
      }
      if (name[0] == 'o' && name[1] == 'n') {
        const event = name.toLowerCase().substring(2)
        element.addEventListener(event, value)

        // TODO: track events using WeakMap
        continue
      }
      if (name in element) { // && !isAttribute i.e href/list/form/width/height?
        element[name] = value
        continue
      }
      // worst case, attributes will coerce like `...children=[object Object]>`
      element.setAttribute(name, typeof value === 'boolean' ? '' : value)
    }
  }
  let child
  while (child = children.pop()) {
    if (!child) {
      // don't render null or false (from `condition && v(...)`)
      continue
    }
    if (Array.isArray(child)) {
      children.push(...child.reverse())
      continue
    }
    if (child instanceof HTMLElement) {
      element.appendChild(child)
      continue
    }
    if (typeof child === 'object') {
      throw new Error('Unexpected object as child. Wrong attributes order?')
    }
    element.appendChild(document.createTextNode(child))
  }
}

export { v }
