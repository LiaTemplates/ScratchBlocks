// <lia-scratch profile="stufe1"> — the Scratch GUI that overlays the code
// block right before it. See bridge.ts for how text and GUI stay in sync.

import { EditorBridge } from './bridge'
import { createEngine, destroyEngine, type VirtualMachine } from './engine'
import { ProjectModel } from './project'
import { resolveProfile, whenProfile, type Profile } from './profiles'
import { StageView } from './stage'
import { BlocksEditor } from './workspace'
import { SpritePane } from './ui/sprites'
import { courseLang, lang, onLanguageChange, t, vmMessages, type Key } from './i18n'
import { onAssetsChanged } from './assets/registry'
import { DEFAULT_SPRITE, SPRITES } from './assets/library'
import { speak } from './speech'

export type Send = {
  lia: (msg: string, details?: any[], ok?: boolean) => void
  handle: (event: string, fn: (...args: any[]) => void) => void
}

const SYNC_DELAY = 150

export class LiaScratchElement extends HTMLElement {
  profile!: Profile
  vm!: VirtualMachine
  project!: ProjectModel
  private renderer: any
  private bridge!: EditorBridge
  private blocks!: BlocksEditor
  private stage!: StageView
  private sprites!: SpritePane
  private root!: HTMLElement
  private errorBox!: HTMLElement
  private observeTimer: number | null = null
  private syncTimer: number | null = null
  private resizeObserver: ResizeObserver | null = null
  /** serialization of the text as it currently stands in the code block */
  private baseline: string | null = null
  private loading = false
  private send: Send | null = null
  private runDone: (() => void) | null = null
  private disposed = false
  private started = false
  /** speech bubble texts at the end of the last runFor (by target id) */
  readonly saidAtEnd = new Map<string, string>()
  private labels: [HTMLElement, Key][] = []
  private stopLanguageWatch: (() => void) | null = null
  private stopAssetWatch: (() => void) | null = null

  /** resolves once the engine is up and the first project is loaded */
  ready!: Promise<void>

  connectedCallback() {
    if (this.started) return
    this.started = true
    const spec = this.getAttribute('profile')
    this.ready = whenProfile(spec)
      .then(() => {
        if (this.disposed) return
        this.profile = resolveProfile(spec)
        this.buildDOM()
        return this.init()
      })
      .catch((e) => {
        console.error('LiaScratch:', e)
        if (this.errorBox) this.showError(String(e?.message || e))
      })
  }

  disconnectedCallback() {
    // LiaScript re-renders slides; only tear down if we are really gone.
    setTimeout(() => {
      if (!this.isConnected) this.dispose()
    }, 0)
  }

  private buildDOM() {
    this.root = document.createElement('div')
    this.root.className = 'ls-root notranslate'
    this.root.lang = lang()
    // page translators (Google) must not touch the blocks: they are
    // translated by Scratch itself, see onLanguage()
    this.setAttribute('translate', 'no')
    this.classList.add('notranslate')

    const main = document.createElement('div')
    main.className = 'ls-main'

    const blocksArea = document.createElement('div')
    blocksArea.className = 'ls-blocks'

    const side = document.createElement('div')
    side.className = 'ls-side'

    this.stage = new StageView({
      onSpriteMoved: (id) => {
        if (!this.isRunning()) {
          this.project.capture(id)
          this.scheduleSync()
        }
      },
      onSpriteSelected: (id) => this.vm.setEditingTarget(id),
    })
    this.stage.dragAll = this.profile.dragSprites !== false

    this.errorBox = document.createElement('div')
    this.errorBox.className = 'ls-error'
    this.errorBox.hidden = true

    this.sprites = new SpritePane(this.profile, {
      select: (id) => this.vm.setEditingTarget(id),
      added: () => {
        this.project.captureNew()
        this.scheduleSync()
      },
    })

    const bar = this.buildToolbar()

    side.append(this.stage.element, this.sprites.element, bar)
    main.append(blocksArea, side)
    this.root.append(main, this.errorBox)
    this.appendChild(this.root)

    // Keys typed into blocks must not switch LiaScript slides.
    blocksArea.addEventListener('keydown', (e) => e.stopPropagation())
  }

  private buildToolbar(): HTMLElement {
    const bar = document.createElement('div')
    bar.className = 'ls-bar'

    const button = (label: Key, fn: () => void) => {
      const b = document.createElement('button')
      b.type = 'button'
      b.textContent = t(label)
      this.labels.push([b, label])
      b.onclick = fn
      bar.appendChild(b)
      return b
    }

    if (this.profile.textView) {
      const toggle = button('text', () => {
        const hidden = this.bridge.isEditorHidden()
        this.bridge.hideEditor(!hidden)
        toggle.classList.toggle('ls-active', hidden)
      })
    }

    if (this.profile.sb3) {
      button('loadSb3', () => this.loadSb3())
      button('saveSb3', () => this.saveSb3())
    }

    button('fullscreen', () => {
      if (document.fullscreenElement) document.exitFullscreen()
      else this.root.requestFullscreen?.()
    })

    return bar
  }

  private async init() {
    this.bridge = new EditorBridge(this, (text) => this.onExternalText(text))
    this.bridge.beforeRun = () => this.syncNow()

    await this.waitForEditor()
    this.bridge.hideEditor()
    this.bridge.observe()
    this.bridge.swapWithCodeBlock()
    this.observeTimer = window.setInterval(() => {
      // LiaScript may re-create the code block, e.g. after switching modes
      this.bridge.observe()
      this.bridge.swapWithCodeBlock()
    }, 500)

    const { vm, renderer } = createEngine(this.stage.canvas)
    this.vm = vm
    this.renderer = renderer
    this.stage.attach(vm, renderer)
    this.project = new ProjectModel(vm, { lang: courseLang(), display: lang() })

    const blocksArea = this.root.querySelector('.ls-blocks') as HTMLElement
    this.blocks = new BlocksEditor(blocksArea, vm, this.profile, lang())
    this.sprites.attach(vm)

    if (this.profile.speech) this.enableSpeech()

    this.resizeObserver = new ResizeObserver(() => this.blocks.resize())
    this.resizeObserver.observe(blocksArea)

    await vm.setLocale(lang(), vmMessages())
    this.stopLanguageWatch = onLanguageChange(() => this.onLanguage())
    if (this.profile.pen) await vm.extensionManager.loadExtensionURL('pen')

    vm.on('PROJECT_CHANGED', () => this.scheduleSync())
    vm.on('PROJECT_RUN_STOP', () => this.runDone?.())

    // an asset defined later (e.g. by a script on the slide) may fix the text
    this.stopAssetWatch = onAssetsChanged(() => {
      if (!this.errorBox.hidden && !this.loading && !this.disposed && !this.isRunning()) {
        this.load(this.bridge.read() ?? '').catch(() => {})
      }
    })

    await this.load(this.bridge.read() ?? '')
  }

  private waitForEditor(): Promise<void> {
    return new Promise((resolve, reject) => {
      let tries = 0
      const check = () => {
        if (this.bridge.editorElement() && this.bridge.read() !== null) return resolve()
        if (++tries > 100) return reject(new Error('no code block found for <lia-scratch>'))
        setTimeout(check, 50)
      }
      check()
    })
  }

  /**
   * The page language changed (e.g. "Translate with Google"): blocks, menus
   * and buttons follow; the text in the code block stays in the course language.
   */
  private async onLanguage() {
    if (this.disposed) return
    const display = lang()
    this.project.options = { lang: courseLang(), display }
    this.root.lang = display
    for (const [el, key] of this.labels) el.textContent = t(key)
    await this.vm.setLocale(display, vmMessages(display))
    this.blocks.setLocale(display)
    this.sprites.render()
  }

  /** Loads text into the VM. The text itself is left untouched. */
  async load(text: string) {
    this.loading = true
    try {
      await this.project.load(text)
      this.hideError()
      // edit the main character (the default sprite, Robo) if there is one,
      // else the first sprite with scripts, else the front-most one
      const sprites = this.vm.runtime.targets.filter((t: any) => !t.isStage && t.isOriginal)
      const hasScripts = (t: any) => Object.values<any>(t.blocks._blocks).some((b: any) => b.topLevel)
      const main = SPRITES[DEFAULT_SPRITE]?.name
      const sprite = sprites.find((t: any) => t.getName() === main) ?? sprites.find(hasScripts) ?? sprites[sprites.length - 1]
      if (sprite) this.vm.setEditingTarget(sprite.id)
      if (this.project.format === 'scratch') this.blocks.workspace.cleanUp()
      await settle()
      this.baseline = this.project.serialize()
      this.bridge.markSynced(text)
    } catch (e: any) {
      this.showError(`${t('textError')}\n${e?.message || e}`)
      throw e
    } finally {
      this.loading = false
    }
  }

  private async onExternalText(text: string) {
    if (text === this.project.loadedText) return
    try {
      await this.load(text)
    } catch {
      // error is shown in the widget, the previous project stays loaded
    }
  }

  scheduleSync() {
    if (this.loading || this.disposed) return
    if (this.syncTimer !== null) clearTimeout(this.syncTimer)
    this.syncTimer = window.setTimeout(() => this.syncNow(), SYNC_DELAY)
  }

  /** Writes the current project into the code block, if it changed. */
  syncNow() {
    if (this.syncTimer !== null) clearTimeout(this.syncTimer)
    this.syncTimer = null
    if (this.loading || this.disposed || !this.project || this.baseline === null) return

    let text: string
    try {
      text = this.project.serialize()
    } catch (e) {
      console.warn('LiaScratch: serializing project', e)
      return
    }
    if (text === this.baseline) return

    this.baseline = text
    this.project.loadedText = text
    this.bridge.write(text)
  }

  isRunning() {
    return this.send !== null
  }

  /** ▶ — called by the macro script with the code block text. */
  async run(send: Send, code: string, options: { untilDone?: boolean } = {}) {
    await this.ready
    this.stopRun()

    if (code !== this.project.loadedText && !this.bridge.hasPending()) {
      await this.load(code)
    }

    if (this.profile.resetOnRun) this.project.reset()

    this.send = send
    send.handle('stop', () => this.stop())

    if (options.untilDone === false) return

    await new Promise<void>((resolve) => {
      this.runDone = resolve
      this.vm.greenFlag()
      // a project without green-flag scripts never starts any thread
      requestAnimationFrame(() => {
        if (this.vm.runtime.threads.length === 0) resolve()
      })
    })
    this.finish()
  }

  /** Starts the green flag and waits until all scripts end (or timeout). */
  async runFor(seconds: number) {
    this.saidAtEnd.clear()
    if (this.profile.resetOnRun) this.project.reset()
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, seconds * 1000)
      this.runDone = () => {
        clearTimeout(timer)
        resolve()
      }
      this.vm.greenFlag()
      requestAnimationFrame(() => {
        if (this.vm.runtime.threads.length === 0) this.runDone?.()
      })
    })
    this.runDone = null
    // remember the speech bubbles: stopping clears them, but checks read them
    this.saidAtEnd.clear()
    for (const target of this.vm.runtime.targets) {
      const text = target.getCustomState?.('Scratch.looks')?.text
      if (text) this.saidAtEnd.set(target.id, String(text))
    }
    // only stop what is still running (e.g. forever loops); a project that
    // ended on its own keeps its bubbles visible
    if (this.vm.runtime.threads.length > 0) this.vm.stopAll()
  }

  stop() {
    this.vm.stopAll()
    this.finish()
  }

  private stopRun() {
    if (this.send) this.finish()
  }

  finish() {
    this.runDone = null
    const send = this.send
    this.send = null
    send?.lia('LIA: stop')
    this.bridge.flush()
  }

  private enableSpeech() {
    const SB = this.blocks.SB
    const flyout = this.blocks.workspace.getFlyout().getWorkspace()
    flyout.addChangeListener((event: any) => {
      if (event.type !== SB.Events.CLICK || !event.blockId) return
      const block = flyout.getBlockById(event.blockId)
      if (block) speak(block.toString())
    })
  }

  private async loadSb3() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.sb3,.sb2,.sb'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      this.loading = true
      try {
        await this.vm.loadProject(await file.arrayBuffer())
        this.project.format = 'json'
        for (const target of this.vm.runtime.targets) if (target.isOriginal) this.project.capture(target.id)
      } catch (e: any) {
        this.showError(String(e?.message || e))
      } finally {
        this.loading = false
      }
      this.baseline = '' // force writing the imported project
      this.syncNow()
    }
    input.click()
  }

  private async saveSb3() {
    const blob: Blob = await this.vm.saveProjectSb3()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'projekt.sb3'
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }

  private showError(message: string) {
    this.errorBox.textContent = message
    this.errorBox.hidden = false
  }

  private hideError() {
    this.errorBox.hidden = true
  }

  private dispose() {
    if (this.disposed) return
    this.disposed = true
    this.stopLanguageWatch?.()
    this.stopAssetWatch?.()
    this.stopRun()
    if (this.observeTimer !== null) clearInterval(this.observeTimer)
    if (this.syncTimer !== null) clearTimeout(this.syncTimer)
    this.resizeObserver?.disconnect()
    this.bridge?.dispose()
    this.blocks?.dispose()
    this.stage?.dispose()
    if (this.vm) destroyEngine(this.vm, this.renderer)
  }
}

/** Waits until queued Blockly events and VM updates have been processed. */
function settle(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 50)))
}
