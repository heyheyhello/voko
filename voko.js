// voko hyperscript reviver

const eventMap = new WeakMap()
const selectorCache = {}
// matches CSS selectors into their tag, id/classes (via #/.), and attributes
const selectorRegex =
  /(?:(^|#|\.)([^#\.\[\]]+))|(\[(.+?)(?:\s*=\s*('|'|)((?:\\[''\]]|.)*?)\5)?\])/g

// numeric CSS properties which shouldn't have 'px' automatically suffixed
// lifted from preact: https://github.com/developit/preact/commit/73947d6abc17967275d9ea690d78e5cf3ef11e37
const styleNoUnit = /acit|ex(?:s|g|n|p|$)|rph|ows|mnc|ntw|ine[ch]|zoo|^ord/i

const parseSelector = selector => {
  const classes = []
  const selectorAttrs = {}
  let tag = 'div'

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

  return selectorCache[selector] = { tag, selectorAttrs }
}

const v = (selector, ...attrChildren) => {
  const type = typeof selector
  if (type !== 'string' && type !== 'function')
    throw new Error('Selector is not a string or function (component)')

  // attrChildren may start with attributes, or be entirely children
  const maybeAttr = attrChildren[0]
  const attrs = (typeof maybeAttr === 'object' && !Array.isArray(maybeAttr))
    ? attrChildren.shift()
    : {}

  // attrChildren is now entirely children. create a stack
  const children = attrChildren.reverse()

  // component is a function, let it do it's own rendering
  if (type !== 'string')
    return selector({ attrs, children })

  const {
    tag, selectorAttrs
  } = selectorCache[selector] || parseSelector(selector)

  const element = document.createElement(tag)
  const classes = []
  // overwrite (or stack) attributes in the selector with those in attrs
  for (const attributes of [selectorAttrs, attrs]) {
    for (const [name, value] of Object.entries(attributes)) {
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
      if (name in element) {
        element[name] = value
        continue
      }
      // worst case, attributes will coerce like `...children=[object Object]>`
      element.setAttribute(name, typeof value === 'boolean' ? '' : value)
    }
  }
  if (classes.length)
    element.className = classes.join(' ')

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
  return element
}

v.events = eventMap

export { v }
