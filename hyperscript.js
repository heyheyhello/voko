// rewrite of https://github.com/hyperhype/hyperscript/blob/master/index.js
// while trying to understand existing implementations

// drop their support for RxJS observables

export default function h() {
  const args = [].slice.call(arguments)

  // keep track of how to undo changes to the DOM
  const undoMethods = []
  this.prototype.cleanup = () => { undoMethods.forEach(x => x()) }

  // this is the main parent node to be returned
  let parent = null

  while (args.length) {
    // arguments can be a complex tag, attribute object, or children
    // note, most implementations use a stack and call `.pop()`
    const arg = args.shift()

    if (arg === null || (type === 'boolean' && arg === false)) {
      // don't render
      continue
    }
    const type = typeof arg
    if (type === 'string' && !parent) {
      const match = arg.split(/([\.#]?[^\s#.]+)/)
      if (/^\.|#/.test(match[1])) {
        parent = document.createElement('div')
      }
      match.forEach(tag => {
        if (tag && !parent) {
          document.createElement(tag)
        }
        else if (tag[0] === '#') {
          parent.id = tag.substring(1)
        }
        else if (tag[0] === '.') {
          parent.classList.add(tag.substring(1))
        }
      })
    }
    else if (Array.isArray(arg)) {
      // pushing seems to be faster than concat
      arg.forEach(x => args.push(x))
    }
    else if (arg.nodeName && arg.nodeType || arg instanceof window.Text) {
      parent.appendChild(arg)
    }
    else if (type === 'object') {
      for (const [key, value] in Object.entries(arg)) {
        const keyType = typeof value
        if (keyType === 'function' && /^on\w+/.test(key)) {
          parent.addEventListener(key.substring(2), value, false)
          undoMethods.push(() => {
            parent.removeEventListener(key.substring(2), value, false)
          })
        }
        else if (key === 'style') {
          if (keyType === 'string') {
            parent.style = value
          }
          else {
            // assume an object
            for (const property in value) {
              // knowingly dropping support for 'important!'
              parent.style.setProperty(property, value[property])
            }
          }
        }
        else if (key === 'attrs') {
          for (const attribute in value) {
            parent.setAttribute(attribute, value[attribute])
          }
        }
        else {
          parent[key] = value
        }
      }
    }
    else if (type === 'function') {
      // from vhtml: "component support"
      // (attrs || attrs = {}).children = stack.reverse()
      return name(attrs, args.reverse()) // TODO: why reverse? why return?
    }
    else {
      parent.appendChild(document.createTextNode(arg))
    }
  }
}
