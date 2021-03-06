import fs from 'fs'
import UglifyES from 'uglify-es'

const reservedDOMProps = [
  'createElement',
  'createElementNS',
  'createDocumentFragment',
  'createTextNode',
  'id',
  'style',
  'cssText',
  'className',
  'setAttribute',
  'addEventListener',
  'appendChild',
]

const options = {
  ecma: 5,
  mangle: {
    reserved: ['v'],
    properties: {
      reserved: ['fragment', 'events', 'ns', 'svg', ...reservedDOMProps]
    },
  },
  toplevel: true,
  output: {
    beautify: false,
  },
}

const content = fs.readFileSync('voko.js', 'utf-8')
const { code, error } = UglifyES.minify(content, options)
if (error) throw error

const reduced = code
  .replace(/ new Error\("(.+?)"\)/g, '"$1"')
  .replace('isn\'t a', 'not')
  .replace('Unexpected object as child', 'Child is object')
  .replace(' (component)', '')
  .replace(/const/g, 'let')
  .slice(0, -("export{v};".length))

fs.writeFileSync('voko.min.js', `window.v=(()=>{${reduced}return v})()\n`)
