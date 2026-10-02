// Connects a <lia-scratch> element with the LiaScript code block rendered
// right before it, without any changes to LiaScript itself:
//
// * GUI → text: small ACE edits (see textdiff.ts) fire ACE's `change`, which
//   makes LiaScript's <lia-editor> dispatch `editorUpdate`, so Elm stores the
//   new code. A new version is created by LiaScript on the next ▶ (Run).
//   In a classroom, each edit is also sent as a delta to the shared text, so
//   students can build one project together.
// * Changes of others that the GUI has not loaded yet are merged, not
//   overwritten (see flush).
// * text → GUI: when LiaScript switches versions it sets the editor value with
//   its own events blocked — ACE still emits `change`, which we listen to.
//
// Everything here relies on LiaScript's DOM (.lia-code, lia-editor) and
// therefore lives in this one module.

import { diffText, merge } from './textdiff'

type Ace = any

const HIDDEN_CLASS = 'lia-scratch--editor-hidden'

export class EditorBridge {
  private host: HTMLElement
  /** the text the GUI is built from; only a load or a write moves it on */
  private lastWritten: string | null = null
  private pending: string | null = null
  private flushTimer: number | null = null
  private observedEditor: Ace | null = null
  private changeHandler: (() => void) | null = null
  private onExternal: (text: string) => void
  private runButtonHandler: ((e: Event) => void) | null = null
  private observedButton: Element | null = null
  private swapObserver: ResizeObserver | null = null
  private swappedBlock: HTMLElement | null = null

  /** flushes pending GUI changes before LiaScript executes ▶ */
  beforeRun: () => void = () => {}

  constructor(host: HTMLElement, onExternal: (text: string) => void) {
    this.host = host
    this.onExternal = onExternal
  }

  /** The .lia-code block that precedes the host element in document order. */
  codeBlock(): HTMLElement | null {
    const blocks = Array.from(document.querySelectorAll<HTMLElement>('.lia-code'))
    let found: HTMLElement | null = null
    for (const block of blocks) {
      if (block.compareDocumentPosition(this.host) & Node.DOCUMENT_POSITION_FOLLOWING) {
        found = block
      }
    }
    return found
  }

  /** The box around LiaScript's ▶/⏹ button of the code block. */
  runControl(): HTMLElement | null {
    return this.codeBlock()?.querySelector<HTMLElement>('.lia-code-control__action') ?? null
  }

  /** LiaScript's ▶/⏹ button itself. */
  runButton(): HTMLElement | null {
    const control = this.runControl()
    return control?.querySelector<HTMLElement>('button') ?? control
  }

  /** The <lia-editor> of file `index` within the code block. */
  editorElement(index = 0): any {
    const block = this.codeBlock()
    return block?.querySelectorAll('lia-editor')[index] ?? null
  }

  private ace(index = 0): Ace | null {
    const el = this.editorElement(index)
    return el?.env?.editor ?? el?._editor ?? null
  }

  read(index = 0): string | null {
    const ace = this.ace(index)
    if (ace) return ace.getValue()
    const el = this.editorElement(index)
    return el ? el.value ?? null : null
  }

  /** Is LiaScript currently accepting edits (i.e. not running)? */
  writable(index = 0): boolean {
    const el = this.editorElement(index)
    return !!el && !el.readOnly
  }

  /**
   * Writes `text` into the code block. While LiaScript is running the editor
   * is read-only, so the text is kept and written as soon as that ends.
   */
  write(text: string) {
    this.pending = text
    this.flush()
  }

  hasPending() {
    return this.pending !== null
  }

  flush() {
    if (this.pending === null) return

    const ace = this.ace()
    if (!ace || !this.writable()) {
      if (this.flushTimer === null) {
        this.flushTimer = window.setTimeout(() => {
          this.flushTimer = null
          this.flush()
        }, 200)
      }
      return
    }

    const mine = this.pending
    this.pending = null

    // The GUI was built from `lastWritten`. If the text changed since (a
    // classroom partner, not yet loaded), keep their changes and hand the
    // merged text back to the GUI.
    const current = ace.getValue()
    const base = this.lastWritten
    const text = base !== null && current !== base ? merge(base, mine, current) : mine
    this.lastWritten = text
    if (text !== mine) window.setTimeout(() => this.onExternal(text))

    if (current === text) return
    applyEdits(ace, current, text)

    // Fallback in case the change listener of lia-editor is not attached.
    const el = this.editorElement()
    if (el && el.value !== text) {
      el.dispatchEvent(new CustomEvent('editorUpdate', { detail: text }))
    }
  }

  /** Hides the text editor of the program file, keeping ▶/⏹ and versions. */
  hideEditor(hidden = true) {
    const block = this.codeBlock()
    if (!block) return
    ensureStyle()
    block.classList.toggle(HIDDEN_CLASS, hidden)
    block.classList.add('lia-scratch--attached')
  }

  isEditorHidden() {
    return !!this.codeBlock()?.classList.contains(HIDDEN_CLASS)
  }

  /**
   * (Re-)attaches listeners to the current ACE instance and run button.
   * LiaScript may re-create these, so this is called periodically.
   */
  observe() {
    const ace = this.ace()
    if (ace && ace !== this.observedEditor) {
      this.detachEditor()
      this.observedEditor = ace
      let timer: number | null = null
      this.changeHandler = () => {
        if (timer !== null) clearTimeout(timer)
        timer = window.setTimeout(() => {
          timer = null
          // lastWritten stays until the text is loaded: until then it is the
          // base for merging own changes (see flush)
          const text = ace.getValue()
          if (text !== this.lastWritten) this.onExternal(text)
        }, 60)
      }
      ace.on('change', this.changeHandler)
    }

    const button = this.runControl()
    if (button !== this.observedButton) {
      this.detachButton()
      this.observedButton = button
      if (button) {
        // capture phase: runs before LiaScript/Elm handles the click
        this.runButtonHandler = () => this.beforeRun()
        button.addEventListener('pointerdown', this.runButtonHandler, true)
        button.addEventListener('click', this.runButtonHandler, true)
      }
    }
  }

  /**
   * Shows the GUI above the code block, so ▶/⏹ and the versions appear below
   * Scratch. Only relative offsets are used: moving nodes into LiaScript's
   * DOM would break its virtual DOM. Both elements swap their visual places
   * within the space they occupy together, so the page layout is unchanged.
   */
  swapWithCodeBlock() {
    const block = this.codeBlock()
    if (!block || block === this.swappedBlock) return
    this.unswap()
    this.swappedBlock = block

    const host = this.host
    host.style.marginTop = '0'
    const update = () => {
      if (!block.isConnected) return
      const gap = parseFloat(getComputedStyle(block).marginBottom) || 0
      block.style.position = 'relative'
      block.style.top = `${host.offsetHeight + gap}px`
      host.style.position = 'relative'
      host.style.top = `${-(block.offsetHeight + gap)}px`
    }
    this.swapObserver = new ResizeObserver(update)
    this.swapObserver.observe(block)
    this.swapObserver.observe(host)
    update()
  }

  private unswap() {
    this.swapObserver?.disconnect()
    this.swapObserver = null
    if (this.swappedBlock) {
      this.swappedBlock.style.position = ''
      this.swappedBlock.style.top = ''
    }
    this.swappedBlock = null
  }

  /** Remembers `text` as in sync, so the resulting change is not echoed. */
  markSynced(text: string) {
    this.lastWritten = text
  }

  private detachEditor() {
    if (this.observedEditor && this.changeHandler) {
      this.observedEditor.off('change', this.changeHandler)
    }
    this.observedEditor = null
    this.changeHandler = null
  }

  private detachButton() {
    if (this.observedButton && this.runButtonHandler) {
      this.observedButton.removeEventListener('pointerdown', this.runButtonHandler, true)
      this.observedButton.removeEventListener('click', this.runButtonHandler, true)
    }
    this.observedButton = null
    this.runButtonHandler = null
  }

  dispose() {
    this.detachEditor()
    this.detachButton()
    this.unswap()
    if (this.flushTimer !== null) clearTimeout(this.flushTimer)
  }
}

/** Writes only what changed — like typing — instead of replacing everything. */
function applyEdits(ace: Ace, from: string, to: string) {
  const doc = ace.getSession().getDocument()
  // back to front, so that the offsets of earlier edits stay valid
  for (const edit of diffText(from, to).reverse()) {
    const start = doc.indexToPosition(edit.start, 0)
    const end = doc.indexToPosition(edit.end, 0)
    if (edit.end > edit.start) doc.remove({ start, end })
    if (edit.text) doc.insert(start, edit.text)
  }
  if (ace.getValue() !== to) ace.setValue(to, 1)
}

let styleInjected = false

function ensureStyle() {
  if (styleInjected) return
  styleInjected = true
  const style = document.createElement('style')
  style.textContent = `
.lia-code.${HIDDEN_CLASS} > .lia-code__input:first-of-type { display: none !important; }
`
  document.head.appendChild(style)
}
