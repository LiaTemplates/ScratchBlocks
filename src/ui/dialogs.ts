// Small modal dialogs inside the widget (variable names, custom blocks).

import { t } from '../i18n'
import { mediaPath } from '../media'

function overlay(container: HTMLElement, title: string) {
  const root = container.closest('.ls-root') || container
  const back = document.createElement('div')
  back.className = 'ls-dialog-back'
  const box = document.createElement('div')
  box.className = 'ls-dialog'
  box.setAttribute('role', 'dialog')
  box.setAttribute('aria-modal', 'true')
  const heading = document.createElement('div')
  heading.className = 'ls-dialog-title'
  heading.textContent = title
  box.appendChild(heading)
  back.appendChild(box)
  root.appendChild(back)
  // keep LiaScript from reacting to keys typed into the dialog
  back.addEventListener('keydown', (e) => e.stopPropagation())
  return { back, box, close: () => back.remove() }
}

function buttons(box: HTMLElement, onCancel: () => void, onOk: () => void) {
  const row = document.createElement('div')
  row.className = 'ls-dialog-buttons'
  const cancel = document.createElement('button')
  cancel.type = 'button'
  cancel.textContent = t('cancel')
  cancel.onclick = onCancel
  const ok = document.createElement('button')
  ok.type = 'button'
  ok.className = 'ls-primary'
  ok.textContent = t('ok')
  ok.onclick = onOk
  row.append(cancel, ok)
  box.appendChild(row)
  return ok
}

export function promptDialog(container: HTMLElement, message: string, defaultValue = ''): Promise<string | null> {
  return new Promise((resolve) => {
    const { box, close } = overlay(container, message)
    const input = document.createElement('input')
    input.type = 'text'
    input.value = defaultValue || ''
    box.appendChild(input)

    const done = (value: string | null) => {
      close()
      resolve(value)
    }
    buttons(box, () => done(null), () => done(input.value))
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') done(input.value)
      if (e.key === 'Escape') done(null)
    })
    setTimeout(() => input.focus())
  })
}

/** Editor for custom blocks ("Make a Block"), ported from scratch-gui. */
export function procedureDialog(
  container: HTMLElement,
  SB: any,
  mutation: Element,
  callback: (mutation?: Element | null) => void
) {
  const { box, close } = overlay(container, t('makeBlock'))
  const area = document.createElement('div')
  area.className = 'ls-procedure-area'
  box.appendChild(area)

  const workspace = SB.inject(area, {
    zoom: { controls: false, wheel: false, startScale: 0.9 },
    comments: false,
    collapse: false,
    scrollbars: true,
    modalInputs: false,
    media: mediaPath(),
  })

  const root = workspace.newBlock('procedures_declaration')
  root.setMovable(false)
  root.setDeletable(false)
  root.contextMenu = false

  workspace.addChangeListener(() => {
    root.onChangeFn()
    const metrics = workspace.getMetrics()
    const { x, y } = root.getRelativeToSurfaceXY()
    const dy = metrics.viewHeight / 2 - root.height / 2 - y
    let dx = metrics.viewWidth / 2 - root.width / 2 - x
    if (root.width > metrics.viewWidth) dx = metrics.viewWidth - root.width - x
    root.moveBy(dx, dy)
  })

  root.domToMutation(mutation)
  root.initSvg()
  root.render()
  setTimeout(() => root.focusLastEditor_?.())

  const tools = document.createElement('div')
  tools.className = 'ls-dialog-tools'
  const add = (label: string, fn: () => void) => {
    const b = document.createElement('button')
    b.type = 'button'
    b.textContent = label
    b.onclick = fn
    tools.appendChild(b)
  }
  add(t('addInput'), () => root.addStringNumberExternal())
  add(t('addBoolean'), () => root.addBooleanExternal())
  add(t('addLabel'), () => root.addLabelExternal())

  const warpLabel = document.createElement('label')
  const warp = document.createElement('input')
  warp.type = 'checkbox'
  warp.checked = root.getWarp()
  warp.onchange = () => root.setWarp(warp.checked)
  warpLabel.append(warp, ' ' + t('runWithoutRefresh'))
  tools.appendChild(warpLabel)
  box.appendChild(tools)

  const finish = (result: Element | null) => {
    try {
      SB.WidgetDiv.hide()
      workspace.dispose()
    } catch (e) {
      console.warn('LiaScratch: closing block editor', e)
    }
    close()
    callback(result)
  }
  buttons(box, () => finish(null), () => finish(root.mutationToDom(true)))
}
