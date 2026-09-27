// Static pictures of blocks (@Scratch.blocks): scratchblocks notation → SVG in
// the Scratch 3 look, in the language of the course. No VM, no editor.

import init from 'scratchblocks/index.js'
import languages from 'scratchblocks/locales/all.js'
import { courseLang } from './i18n'

let sb: any = null

function scratchblocks() {
  if (!sb) {
    sb = init(window)
    sb.loadLanguages(languages)
    sb.appendStyles()
  }
  return sb
}

/** Renders scratchblocks text as SVG markup (English is always understood). */
export function renderBlocks(code: string, scale = 1): string {
  const lib = scratchblocks()
  const lang = courseLang()
  const doc = lib.parse(code.trim(), { languages: lang === 'en' ? ['en'] : ['en', lang] })
  const svg: SVGSVGElement = lib.render(doc, { style: 'scratch3', scale })
  svg.setAttribute('role', 'img')
  svg.setAttribute('aria-label', code.trim())
  return svg.outerHTML
}
