// The scratch-blocks workspace, wired to a VM like scratch-gui's
// containers/blocks.jsx does (ported without React).

import makeToolboxXML from './vendor/scratch-gui/make-toolbox-xml'
import VMScratchBlocks from './vendor/scratch-gui/blocks'
import defineDynamicBlock from './vendor/scratch-gui/define-dynamic-block'
import { blockColors } from './vendor/scratch-gui/colors'
import { filterToolbox, isAllowed, type Profile } from './profiles'
import { procedureDialog, promptDialog } from './ui/dialogs'
import type { VirtualMachine } from './engine'
import { mediaPath } from './media'
import { overlay, rescueBody } from './dom-guard'

export class BlocksEditor {
  readonly SB: any
  readonly workspace: any
  private vm: VirtualMachine
  private profile: Profile
  private container: HTMLElement
  private toolboxTimer: number | null = null
  private toolboxQueue: (() => void)[] = []
  private renderedToolbox = ''
  private listeners: [string, (...args: any[]) => void][] = []
  private toolboxUpdateListener: (e: any) => void

  constructor(container: HTMLElement, vm: VirtualMachine, profile: Profile, locale: string) {
    this.container = container
    this.vm = vm
    this.profile = profile
    this.SB = VMScratchBlocks(vm)
    this.activate()

    const SB = this.SB
    SB.ScratchMsgs.setLocale(locale)
    // Blockly's widget/dropdown/tooltip divs must not end up in <body>
    ;(SB.common?.setParentContainer ?? SB.setParentContainer)?.(overlay())

    this.workspace = SB.inject(container, {
      media: mediaPath(),
      toolbox: this.toolboxXML(true),
      zoom: { controls: true, wheel: true, pinch: true, startScale: profile.zoom },
      move: { wheel: true },
      grid: { spacing: 40, length: 2, colour: '#ddd' },
      comments: true,
      collapse: false,
      sounds: false,
      trashcan: false,
      modalInputs: false,
      maxBlocks: profile.maxBlocks > 0 ? profile.maxBlocks : Infinity,
      theme: new SB.Theme('default', blockColors),
      scratchTheme: 'classic',
    })

    this.workspace.registerToolboxCategoryCallback('VARIABLE', (ws: any) =>
      SB.ScratchVariables.getVariablesCategory(ws).filter((el: Element) => this.allowedItem(el))
    )
    this.workspace.registerToolboxCategoryCallback('PROCEDURE', (ws: any) =>
      SB.ScratchProcedures.getProceduresCategory(ws)
    )

    this.toolboxUpdateListener = (event: any) => {
      const E = SB.Events
      if (
        event.type === E.VAR_CREATE ||
        event.type === E.VAR_RENAME ||
        event.type === E.VAR_DELETE ||
        (event.type === E.BLOCK_DELETE && event.oldJson?.type === 'procedures_definition') ||
        (event.type === E.BLOCK_CREATE && event.json?.type === 'procedures_definition' && !event.recordUndo)
      ) {
        this.requestToolboxUpdate()
      }
    }
    this.workspace.addChangeListener(this.toolboxUpdateListener)

    const flyoutWorkspace = this.workspace.getFlyout().getWorkspace()
    const varButton = (type: string) => () => SB.ScratchVariables.createVariable(this.workspace, null, type)
    flyoutWorkspace.registerButtonCallback('MAKE_A_VARIABLE', varButton(''))
    flyoutWorkspace.registerButtonCallback('MAKE_A_LIST', varButton('list'))
    flyoutWorkspace.registerButtonCallback('MAKE_A_PROCEDURE', () =>
      SB.ScratchProcedures.createProcedureDefCallback(this.workspace)
    )

    this.renderedToolbox = this.toolboxXML(true)

    // scratch-blocks fixes the flyout at scale 0.675 — younger children get
    // the same (larger) block size in the flyout as in the workspace.
    if (profile.zoom > 0.675) {
      const flyout = this.workspace.getFlyout()
      flyout.getFlyoutScale = () => profile.zoom
      flyout.getWidth = () => Math.round((250 * profile.zoom) / 0.675)
      this.workspace.updateToolbox(this.renderedToolbox)
      SB.svgResize(this.workspace)
    }

    this.workspace.getToolbox().selectItemByPosition(0)
    rescueBody()

    this.attachVM()

    // Global scratch-blocks state (menus, dialogs) must point to the VM of the
    // editor the child is currently working with.
    container.addEventListener('pointerdown', () => this.activate(), true)
    container.addEventListener('focusin', () => this.activate(), true)
  }

  /** Rebinds page-global scratch-blocks hooks to this editor's VM. */
  activate() {
    const SB = VMScratchBlocks(this.vm)
    SB.dialog.setPrompt(this.handlePrompt)
    SB.ScratchVariables.setPromptHandler(this.handlePrompt)
    SB.ScratchProcedures.externalProcedureDefCallback = (mutation: Element, callback: any) =>
      procedureDialog(this.container, SB, mutation, callback)
  }

  private handlePrompt = (
    message: string,
    defaultValue: string,
    callback: (value: string | null, names?: string[], options?: any) => void,
    _title?: string,
    varType?: string
  ) => {
    promptDialog(this.container, message, defaultValue).then((value) => {
      if (value === null) return callback(null)
      const type = typeof varType === 'string' ? varType : ''
      callback(value, this.vm.runtime.getAllVarNamesOfType(type), { scope: 'global', isCloud: false })
    })
  }

  private allowedItem(el: Element) {
    if (el.tagName?.toLowerCase() !== 'block') return true
    return isAllowed(this.profile, el.getAttribute('type') || '')
  }

  private toolboxXML(initial = false): string {
    let xml: string | null = null
    try {
      let target = this.vm.editingTarget
      const stage = this.vm.runtime.getTargetForStage()
      if (!target) target = stage
      const stageCostumes = stage.getCostumes()
      const targetCostumes = target.getCostumes()
      const targetSounds = target.getSounds()
      xml = makeToolboxXML(
        false,
        target.isStage,
        target.id,
        this.vm.runtime.getBlocksXML(target),
        targetCostumes[targetCostumes.length - 1].name,
        stageCostumes[stageCostumes.length - 1].name,
        targetSounds.length > 0 ? targetSounds[targetSounds.length - 1].name : ''
      )
    } catch {
      xml = makeToolboxXML(initial, true, null, [], '', '', '')
    }
    return filterToolbox(xml!, this.profile)
  }

  requestToolboxUpdate() {
    if (this.toolboxTimer !== null) clearTimeout(this.toolboxTimer)
    this.toolboxTimer = window.setTimeout(() => this.updateToolbox(), 0)
  }

  private withToolboxUpdates(fn: () => void) {
    if (this.toolboxTimer !== null) this.toolboxQueue.push(fn)
    else fn()
  }

  private updateToolbox() {
    this.toolboxTimer = null
    const xml = this.toolboxXML()
    if (xml !== this.renderedToolbox) {
      const toolbox = this.workspace.getToolbox()
      const flyout = this.workspace.getFlyout()
      const scale = flyout.getWorkspace().scale
      const selected = toolbox.getSelectedItem()?.getName()
      const pos = selected ? flyout.getCategoryScrollPosition(selected) * scale : 0
      const offset = flyout.getWorkspace().getMetrics().viewTop - pos

      this.workspace.updateToolbox(xml)
      toolbox.runAfterRerender?.(() => {
        const newPos = selected ? flyout.getCategoryScrollPosition(selected) : null
        if (newPos) flyout.getWorkspace().scrollbar.setY(newPos * scale + offset)
      })
      toolbox.forceRerender?.()
      this.renderedToolbox = xml
    }

    const queue = this.toolboxQueue
    this.toolboxQueue = []
    queue.forEach((fn) => fn())
  }

  private on(event: string, fn: (...args: any[]) => void) {
    this.vm.addListener(event, fn)
    this.listeners.push([event, fn])
  }

  private attachVM() {
    const SB = this.SB
    this.workspace.addChangeListener(this.vm.blockListener)
    const flyoutWorkspace = this.workspace.getFlyout().getWorkspace()
    flyoutWorkspace.addChangeListener(this.vm.flyoutBlockListener)
    flyoutWorkspace.addChangeListener(this.vm.monitorBlockListener)

    this.on('SCRIPT_GLOW_ON', (data) => SB.glowStack(data.id, true))
    this.on('SCRIPT_GLOW_OFF', (data) => SB.glowStack(data.id, false))
    this.on('VISUAL_REPORT', (data) => SB.reportValue(data.id, data.value))
    this.on('workspaceUpdate', (data) => this.onWorkspaceUpdate(data))
    this.on('targetsUpdate', () => this.onTargetsUpdate())
    this.on('MONITORS_UPDATE', (monitors) => this.onMonitorsUpdate(monitors))
    this.on('EXTENSION_ADDED', (info) => this.onExtensionAdded(info))
    this.on('BLOCKSINFO_UPDATE', (info) => this.onExtensionAdded(info))
  }

  private onTargetsUpdate() {
    if (!this.vm.editingTarget || !this.workspace.getFlyout()) return
    ;['glide', 'move', 'set'].forEach((prefix) => {
      this.updateToolboxBlockValue(`${prefix}x`, Math.round(this.vm.editingTarget.x).toString())
      this.updateToolboxBlockValue(`${prefix}y`, Math.round(this.vm.editingTarget.y).toString())
    })
  }

  private updateToolboxBlockValue(id: string, value: string) {
    this.withToolboxUpdates(() => {
      const block = this.workspace.getFlyout().getWorkspace().getBlockById(id)
      if (block) block.inputList[0].fieldRow[0].setValue(value)
    })
  }

  private onWorkspaceUpdate(data: { xml: string }) {
    const SB = this.SB
    this.requestToolboxUpdate()

    this.workspace.removeChangeListener(this.toolboxUpdateListener)
    try {
      SB.Events.disable()
      const dom = SB.utils.xml.textToDom(data.xml)
      SB.clearWorkspaceAndLoadFromXml(dom, this.workspace)
    } catch (error) {
      console.error('LiaScratch: workspace update', error)
    } finally {
      SB.Events.enable()
    }

    this.workspace.clearUndo()
    requestAnimationFrame(() =>
      setTimeout(() => this.workspace.addChangeListener(this.toolboxUpdateListener))
    )
  }

  private onMonitorsUpdate(monitors: any) {
    const flyout = this.workspace.getFlyout()
    for (const monitor of monitors.values()) {
      const blockId = monitor.get('id')
      const isVisible = monitor.get('visible')
      flyout.setCheckboxState?.(blockId, isVisible)
      const block = this.vm.runtime.monitorBlocks.getBlock(blockId)
      if (block) block.isMonitored = isVisible
    }
  }

  private onExtensionAdded(categoryInfo: any) {
    const SB = this.SB
    const defineBlocks = (blockInfoArray: any[]) => {
      if (!blockInfoArray?.length) return
      const staticBlocksJson: any[] = []
      const dynamicBlocksInfo: any[] = []
      blockInfoArray.forEach((blockInfo) => {
        if (blockInfo.info?.isDynamic) dynamicBlocksInfo.push(blockInfo)
        else if (blockInfo.json) staticBlocksJson.push(blockInfo.json)
      })
      SB.defineBlocksWithJsonArray(staticBlocksJson)
      dynamicBlocksInfo.forEach((blockInfo) => {
        const opcode = `${categoryInfo.id}_${blockInfo.info.opcode}`
        SB.Blocks[opcode] = defineDynamicBlock(SB, categoryInfo, blockInfo, opcode)
      })
    }

    defineBlocks(
      Object.getOwnPropertyNames(categoryInfo.customFieldTypes).map(
        (name) => categoryInfo.customFieldTypes[name].scratchBlocksDefinition
      )
    )
    defineBlocks(categoryInfo.menus)
    defineBlocks(categoryInfo.blocks)

    const theme = this.workspace.getTheme()
    theme.setBlockStyle(categoryInfo.id, {
      colourPrimary: categoryInfo.color1,
      colourSecondary: categoryInfo.color2,
      colourTertiary: categoryInfo.color3,
      colourQuaternary: categoryInfo.color3,
    })
    theme.setBlockStyle(`${categoryInfo.id}_selected`, {
      colourPrimary: categoryInfo.color3,
      colourSecondary: categoryInfo.color3,
      colourTertiary: categoryInfo.color3,
      colourQuaternary: categoryInfo.color3,
    })
    this.workspace.setTheme(theme)
    this.requestToolboxUpdate()
  }

  setReadOnly(readOnly: boolean) {
    this.workspace.options.readOnly = readOnly
  }

  resize() {
    this.SB.svgResize(this.workspace)
  }

  dispose() {
    for (const [event, fn] of this.listeners) this.vm.removeListener(event, fn)
    this.listeners = []
    try {
      this.SB.WidgetDiv.hide()
      this.workspace.dispose()
    } catch (e) {
      console.warn('LiaScratch: disposing workspace', e)
    }
    this.vm.clearFlyoutBlocks?.()
  }
}
