import fs from 'fs'
import UglifyES from 'uglify-es'
import reservedDOMProps from 'uglify-es/tools/domprops.json'

const cacheFile = 'minify-cache.json'
const nameCache = fs.existsSync(cacheFile)
  ? JSON.parse(fs.readFileSync(cacheFile, 'utf8'))
  : {}

// domprops.json is extensive; even covering "tag", which I want to mangle
reservedDOMProps.splice(reservedDOMProps.indexOf('tag'), 1)

const options = {
  ecma: 8,
  mangle: {
    reserved: ['v'],
    properties: {
      reserved: ['fragment', 'events'].concat(reservedDOMProps),
    },
  },
  toplevel: true,
  output: {
    beautify: false,
  },
  nameCache,
}

const content = fs.readFileSync('voko.js', 'utf-8')
const { code, error } = UglifyES.minify(content, options)
if (error) throw error

const reduced = code
  .replace(/ new Error\("(.+?)"\)/g, '"$1"')
  .replace('Unexpected o', 'O')
  .replace(' (component)', '')
  .slice(0, -("export{v};".length))

fs.writeFileSync('voko.min.js', `window.v=(()=>{${reduced}return v})()\n`)
fs.writeFileSync(cacheFile, JSON.stringify(options.nameCache, null, 2), 'utf8')
