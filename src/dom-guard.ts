// LiaScript's Elm app owns the children of <body> and patches them by index.
// Any node a library adds there shifts those indices and breaks rendering
// ("Cannot read properties of undefined (reading 'childNodes')").
//
// Known offenders are moved out of <body> as soon as they appear:
// * scratch-blocks/Blockly: widget, dropdown and tooltip divs, measuring canvas
// * scratch-render-fonts: <style id="scratch-font-styles"> (inserted first!)
// * scratch-vm: <script id="scratch-link-extension-script">

const OVERLAY_ID = 'lia-scratch-overlay'

const TO_OVERLAY = [
  '.blocklyWidgetDiv',
  '.blocklyDropDownDiv',
  '.blocklyTooltipDiv',
  '.blocklyComputeCanvas',
  '#scratch-link-extension-script',
]
  .map((s) => ':scope > ' + s)
  .join(', ')

const TO_HEAD = ':scope > #scratch-font-styles'

let observer: MutationObserver | null = null

/** A container next to <body> for nodes that must not live inside it. */
export function overlay(): HTMLElement {
  let el = document.getElementById(OVERLAY_ID)
  if (!el) {
    el = document.createElement('div')
    el.id = OVERLAY_ID
    document.documentElement.appendChild(el)
  }
  return el
}

export function rescueBody() {
  const body = document.body
  if (!body) return
  body.querySelectorAll(TO_HEAD).forEach((node) => document.head.appendChild(node))
  const nodes = body.querySelectorAll(TO_OVERLAY)
  if (nodes.length) {
    const target = overlay()
    nodes.forEach((node) => target.appendChild(node))
  }
}

/** Starts watching <body>; MutationObserver callbacks run before Elm renders. */
export function guardBody() {
  if (observer || !document.body) return
  observer = new MutationObserver(rescueBody)
  observer.observe(document.body, { childList: true })
  rescueBody()
}
