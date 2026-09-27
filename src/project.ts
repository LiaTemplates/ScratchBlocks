// The project model: the code-block text is the source of truth.
//
// The text describes the *program and its start state*. Running the project
// moves sprites around, but that never changes the text — only edits do
// (blocks, sprites, costumes, or dragging a sprite while not running).

import type { VirtualMachine } from './engine'
import { assetsReady } from './assets/registry'
import { parseJson, stringifyJson, type ProjectJSON } from './format/json'
import { parseScratchText, stringifyScratchText, type TextOptions } from './format/scratchtext'

export type Format = 'json' | 'scratch'

interface StartState {
  x: number
  y: number
  direction: number
  size: number
  visible: boolean
  currentCostume: number
  volume: number
  variables: Record<string, any>
}

export function detectFormat(text: string): Format {
  return text.trimStart().startsWith('{') ? 'json' : 'scratch'
}

export function parseProject(text: string, options: TextOptions): { project: ProjectJSON; format: Format } {
  const format = detectFormat(text)
  const project = format === 'json' ? parseJson(text) : parseScratchText(text, options)
  return { project, format }
}

export class ProjectModel {
  format: Format = 'scratch'
  private vm: VirtualMachine
  private start = new Map<string, StartState>()
  /** languages of the text format; updated when the page is translated */
  options: TextOptions
  /** text of the last successful load */
  loadedText: string | null = null

  constructor(vm: VirtualMachine, options: TextOptions) {
    this.vm = vm
    this.options = options
  }

  async load(text: string) {
    // the course's own assets (defineAsset) may still be loading
    await assetsReady()
    const { project, format } = parseProject(text, this.options)
    await this.vm.loadProject(project)
    this.format = format
    this.loadedText = text
    this.start.clear()
    for (const target of this.originals()) this.capture(target.id)
  }

  /** Remembers the current state of a target as its start state. */
  capture(targetId: string) {
    const t = this.vm.runtime.getTargetById(targetId)
    if (!t) return
    const variables: Record<string, any> = {}
    for (const [id, v] of Object.entries<any>(t.variables)) {
      variables[id] = Array.isArray(v.value) ? [...v.value] : v.value
    }
    this.start.set(targetId, {
      x: t.x,
      y: t.y,
      direction: t.direction,
      size: t.size,
      visible: t.visible,
      currentCostume: t.currentCostume,
      volume: t.volume,
      variables,
    })
  }

  /** Captures targets that did not exist yet (e.g. newly added sprites). */
  captureNew() {
    for (const target of this.originals()) {
      if (!this.start.has(target.id)) this.capture(target.id)
    }
  }

  private originals(): any[] {
    return this.vm.runtime.targets.filter((t: any) => t.isOriginal)
  }

  /** Resets all sprites, variables and the pen layer to the start state. */
  reset() {
    this.vm.stopAll()
    try {
      this.vm.runtime.getOpcodeFunction('pen_clear')?.({}, {})
    } catch {
      // pen extension not loaded
    }
    for (const t of this.originals()) {
      const s = this.start.get(t.id)
      if (!s) continue
      if (!t.isStage) {
        t.setXY(s.x, s.y, true)
        t.setDirection(s.direction)
        t.setSize(s.size)
        t.setVisible(s.visible)
      }
      t.setCostume(s.currentCostume)
      t.clearEffects?.()
      for (const [id, value] of Object.entries(s.variables)) {
        if (t.variables[id]) t.variables[id].value = Array.isArray(value) ? [...value] : value
      }
    }
    this.vm.runtime.requestRedraw?.()
  }

  /** The project as JSON, with every target in its start state. */
  toProjectJSON(): ProjectJSON {
    const project: ProjectJSON = JSON.parse(this.vm.toJSON())
    const originals = this.originals()

    project.targets.forEach((json: any, i: number) => {
      const s = this.start.get(originals[i]?.id)
      if (!s) return
      if (!json.isStage) {
        json.x = round(s.x)
        json.y = round(s.y)
        json.direction = round(s.direction)
        json.size = round(s.size)
        json.visible = s.visible
      }
      json.currentCostume = s.currentCostume
      for (const [id, value] of Object.entries(s.variables)) {
        if (json.variables?.[id]) json.variables[id][1] = value
        if (json.lists?.[id]) json.lists[id][1] = value
      }
    })

    delete project.meta
    return project
  }

  /** why the last serialize had to switch from text to project.json */
  fallbackReason: string | null = null

  serialize(): string {
    const project = this.toProjectJSON()
    if (this.format === 'scratch') {
      try {
        return stringifyScratchText(project, this.options)
      } catch (e: any) {
        // e.g. imported costumes or extensions the text format cannot express
        this.format = 'json'
        this.fallbackReason = String(e?.message || e)
      }
    }
    return stringifyJson(project)
  }
}

function round(n: number) {
  return Math.round(n * 100) / 100
}
