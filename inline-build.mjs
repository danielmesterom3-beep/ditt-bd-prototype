// Inline alle CSS en JS assets in index.html → dist/ditt-bd.html
import fs from 'node:fs'
import path from 'node:path'

const distDir = new URL('./dist/', import.meta.url).pathname
const html    = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8')

// Inline <link rel="stylesheet" href="...css">
let result = html.replace(
  /<link rel="stylesheet" crossorigin href="([^"]+)">/g,
  (_, href) => {
    const file = path.join(distDir, href)
    const css  = fs.readFileSync(file, 'utf8')
    return `<style>${css}</style>`
  }
)

// Inline <script type="module" crossorigin src="...js">
result = result.replace(
  /<script type="module" crossorigin src="([^"]+)"><\/script>/g,
  (_, src) => {
    const file = path.join(distDir, src)
    const js   = fs.readFileSync(file, 'utf8')
    return `<script type="module">${js}</script>`
  }
)

const outFile = path.join(distDir, 'ditt-bd.html')
fs.writeFileSync(outFile, result, 'utf8')

const kb = (fs.statSync(outFile).size / 1024).toFixed(1)
console.log(`✓ ${outFile}  (${kb} kB)`)
