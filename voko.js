const eventMap = new WeakMap()
const selectorCache = {}
// decompose selectors such as input#id.main[disabled] and rect:svg[fill=#eee]
const selectorRegex = /(?:(^|#|\.|:)([^#\.\[\]:]+))|(\[(.+?)(?:\s*=\s*("|'|)((?:\\["'\]]|.)*?)\5)?\])/g

// numeric CSS properties which shouldn't have 'px' automatically suffixed
// lifted from preact: https://github.com/developit/preact/commit/73947d6abc17967275d9ea690d78e5cf3ef11e37
const styleNoUnit = /acit|ex(?:s|g|n|p|$)|rph|ows|mnc|ntw|ine[ch]|zoo|^ord/i

const namespaces = {
  // others can be added at runtime as needed via `v.ns[...] = 'http://...'`
  svg: 'http://www.w3.org/2000/svg',
}

const parseSelector = selector => {
  const classes = []
  const selectorAttrs = {}
  let tag = 'div'
  let namespace
  let match
  while (match = selectorRegex.exec(selector)) {
    const [all, type, value] = match
    if (type === '' && value !== '') {
      tag = value
      continue
    }
    if (type === '#') {
      selectorAttrs.id = value
      continue
    }
    if (type === '.') {
      classes.push(value)
      continue
    }
    if (type === ':') {
      namespace = value
      continue
    }
    if (match[3][0] === '[') {
      let attrValue = match[6]
      if (attrValue)
        attrValue = attrValue.replace(/\\(["'])/g, "$1").replace(/\\\\/g, "\\")
      if (match[4] === 'class')
        classes.push(attrValue)
      else
        selectorAttrs[match[4]] = attrValue === ''
          ? attrValue
          : attrValue || true
    }
  }
  if (classes.length > 0)
    selectorAttrs.className = classes.join(' ')

  return selectorCache[selector] = { ns: namespace, tag, selectorAttrs }
}

const withChildren = (parent, children) => {
  const stack = children.reverse()
  while (stack.length) {
    const child = stack.pop()
    if (!child) {
      // don't render null or false (from `condition && v(...)`)
      continue
    }
    if (Array.isArray(child)) {
      stack.push(...child.reverse())
      continue
    }
    if (child instanceof Node) {
      parent.appendChild(child)
      continue
    }
    if (typeof child === 'object') {
      throw new Error('Unexpected object as child')
    }
    parent.appendChild(document.createTextNode(child))
  }
  return parent
}

const v = (selector, ...attrChildren) => {
  const type = typeof selector
  if (type !== 'string' && type !== 'function')
    throw new Error('Selector isn\'t a string or function (component)')

  // attrChildren may start with attributes, or be entirely children
  const maybeAttr = attrChildren[0]
  const attrs = (typeof maybeAttr === 'object' && !Array.isArray(maybeAttr))
    ? attrChildren.shift()
    : {}

  // attrChildren is now entirely children
  const children = attrChildren

  // component is a function, let it do it's own rendering
  if (type !== 'string')
    return selector(attrs, children)

  const {
    ns, tag, selectorAttrs
  } = selectorCache[selector] || parseSelector(selector)

  const element = ns
    ? document.createElementNS(namespaces[ns], tag)
    : document.createElement(tag)

  const classes = []
  // overwrite (or stack) attributes in the selector with those in attrs
  for (const attributes of [selectorAttrs, attrs]) {
    for (const [name, value] of Object.entries(attributes)) {
      // assume it's a function, pass the reference to the node
      if (name === 'ref') {
        value(element)
        continue
      }
      if (name === 'class' || name === 'className') {
        classes.push(value)
        continue
      }
      if (name === 'style') {
        if (!value || typeof value === 'string') {
          element.style.cssText = value || ''
          continue
        }
        if (value && typeof value === 'object') {
          for (const [k, v] of Object.entries(value))
            element.style[k] = (typeof v === 'number' && !styleNoUnit.test(v))
              ? v + 'px'
              : v
        }
        continue
      }
      if (name[0] == 'o' && name[1] == 'n') {
        const event = name.toLowerCase().substring(2)
        element.addEventListener(event, value)

        const events = eventMap.get(element) || {}
        events[event] = value
        eventMap.set(element, events)
        continue
      }
      // skip anything that's namespaced since svgs _need_ setAttibute to work
      if (!ns && name in element) {
        element[name] = value
        continue
      }
      // worst case, attributes will coerce like `...children=[object Object]>`
      element.setAttribute(name, typeof value === 'boolean' ? '' : value)
    }
  }
  if (classes.length)
    element.className = classes.join(' ')

  return withChildren(element, children)
}

v.fragment = (...children) =>
  withChildren(document.createDocumentFragment(), children)

v.events = eventMap

v.ns = namespaces

export { v }
