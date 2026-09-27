// Readable text format based on scratchblocks syntax, in every language
// Scratch supports (the course language, English is always understood too).
//
//   [Stage]                     ← optional section headers
//   variables: score = 0
//
//   when green flag clicked
//   set [score v] to (0)
//
//   [Sprite Robo]
//   x: -100
//   costumes: robo-a, robo-b*   ← * marks the current costume
//
//   when this sprite clicked
//   change [score v] by (1)
//
// Without headers, all scripts belong to "Robo" on a white stage.
// parseScratchText builds a project.json, stringifyScratchText writes it back.
// Anything the text cannot express makes stringify throw (the caller then
// falls back to the json format).

import { parse } from 'scratchblocks/syntax/index.js'
import specs from './specs.json'
import { expandProject, type ProjectJSON } from './json'
import { defaultSpriteJSON, spriteJSON, spritePreset, stageJSON } from './default'
import { BACKDROPS, COSTUMES, DEFAULT_BACKDROP, DEFAULT_SPRITE, SOUNDS, SPRITES } from '../assets/library'
import { assetError } from '../assets/registry'
import { libraryIds } from '../engine'
import type { Key } from '../i18n'
import { resolveLang } from '../i18n'
import { textLanguage, type Property, type TextLanguage } from './language'

export interface TextOptions {
  /** language the text is written in (the course), e.g. "en", "de", "et", "pt-br" */
  lang: string
  /** language of the interface, if the page is translated; read as well */
  display?: string
}

function languageOf(options: TextOptions) {
  const code = resolveLang(options.lang)
  return textLanguage(code, options.display ? resolveLang(options.display) : code)
}

interface ArgSpec {
  name: string
  kind: 'input' | 'field'
  shadow?: string
  shadowField?: string | null
  default?: string
  dropdown?: boolean
  variable?: string
}

interface BlockSpec {
  sb: string
  shape: string
  args: ArgSpec[]
  statements: string[]
}

const BLOCKS = specs.blocks as Record<string, BlockSpec>

/** scratchblocks id → opcode */
const OPCODE_BY_SB: Record<string, string> = {}
for (const [opcode, spec] of Object.entries(BLOCKS)) {
  if (opcode !== 'control_if_else') OPCODE_BY_SB[spec.sb] = opcode
}

const PRIMITIVES: Record<string, number> = {
  math_number: 4,
  math_positive_number: 5,
  math_whole_number: 6,
  math_integer: 7,
  math_angle: 8,
  colour_picker: 9,
  text: 10,
}
const PRIMITIVE_TYPES = Object.fromEntries(Object.entries(PRIMITIVES).map(([k, v]) => [v, k]))

// ---------------------------------------------------------------------------
// parsing
// ---------------------------------------------------------------------------

export class TextError extends Error {
  constructor(
    message: string,
    readonly line?: number,
    lang?: TextLanguage
  ) {
    super(line ? `${(lang ?? textLanguage('en')).message('line', String(line))}: ${message}` : message)
  }
}

interface Section {
  kind: 'stage' | 'sprite'
  name: string
  line: number
  props: [Property, string, number][]
  code: string
  codeLine: number
}

const HEADER = /^\s*\[\s*([^\[\]]+?)\s*\]\s*$/

/** "[Stage]" → stage, "[Sprite Name]" → sprite "Name", anything else → null */
function header(line: string, lang: TextLanguage): { kind: 'stage' | 'sprite'; name: string } | null {
  const m = HEADER.exec(line)
  if (!m) return null
  const inner = m[1]
  if (lang.isStageWord(inner)) return { kind: 'stage', name: 'Stage' }
  const space = inner.indexOf(' ')
  const first = space < 0 ? inner : inner.slice(0, space)
  if (lang.isSpriteWord(first)) {
    return { kind: 'sprite', name: space < 0 ? SPRITES[DEFAULT_SPRITE].name : inner.slice(space + 1).trim() }
  }
  // sprite words with spaces
  for (const n of [1, 2, 3]) {
    const words = inner.split(' ')
    if (words.length > n && lang.isSpriteWord(words.slice(0, n + 1).join(' '))) {
      return { kind: 'sprite', name: words.slice(n + 1).join(' ') || SPRITES[DEFAULT_SPRITE].name }
    }
  }
  return null
}

function splitSections(text: string, lang: TextLanguage): Section[] {
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  const sections: Section[] = []
  let current: Section | null = null
  let inProps = false
  const code: string[][] = []

  lines.forEach((line, i) => {
    const head = header(line, lang)
    if (head) {
      current = {
        kind: head.kind,
        name: head.name,
        line: i + 1,
        props: [],
        code: '',
        codeLine: i + 2,
      }
      sections.push(current)
      code.push([])
      inProps = true
      return
    }

    if (!current) {
      current = {
        kind: 'sprite',
        name: SPRITES[DEFAULT_SPRITE].name,
        line: 0,
        props: [],
        code: '',
        codeLine: 1,
      }
      sections.push(current)
      code.push([])
      inProps = true
    }

    const prop = /^\s*([^:\[\]()<>]+?)\s*:\s*(.*)$/.exec(line)
    const property = prop ? lang.property(prop[1]) : undefined
    if (inProps && prop && property) {
      current.props.push([property, prop[2].trim(), i + 1])
      current.codeLine = i + 2
      return
    }
    if (inProps && line.trim() === '' && current.props.length) {
      current.codeLine = i + 2
      return
    }
    inProps = false
    code[code.length - 1].push(line)
  })

  sections.forEach((s, i) => (s.code = code[i].join('\n')))
  return sections
}

let idCounter = 0
const nextId = (prefix = 'b') => `${prefix}${++idCounter}`

function parseValue(v: string): string | number {
  const n = Number(v)
  return v.trim() !== '' && Number.isFinite(n) && String(n) === v.trim() ? n : v
}

function splitList(v: string): string[] {
  return v.trim() === '' ? [] : v.split(',').map((s) => s.trim())
}

class ProjectBuilder {
  stage: any
  constructor() {
    this.stage = stageJSON()
  }

  /** looks up a variable (sprite first, then stage) or creates a global one */
  variable(target: any, name: string, type: '' | 'list' | 'broadcast_msg'): string {
    if (type === 'broadcast_msg') {
      for (const [id, n] of Object.entries(this.stage.broadcasts)) if (n === name) return id
      const id = nextId('msg')
      this.stage.broadcasts[id] = name
      return id
    }
    const key = type === 'list' ? 'lists' : 'variables'
    for (const t of [target, this.stage]) {
      for (const [id, v] of Object.entries<any>(t[key])) if (v[0] === name) return id
    }
    const id = nextId(type === 'list' ? 'list' : 'var')
    this.stage[key][id] = [name, type === 'list' ? [] : 0]
    return id
  }

  isList(target: any, name: string) {
    return [target, this.stage].some((t) => Object.values<any>(t.lists).some((l) => l[0] === name))
  }
}

interface ProcInfo {
  proccode: string
  argumentids: string[]
  argumentnames: string[]
}

class ScriptConverter {
  blocks: Record<string, any> = {}
  procs = new Map<string, ProcInfo>()
  params = new Set<string>()

  constructor(
    readonly target: any,
    readonly builder: ProjectBuilder,
    readonly lang: TextLanguage
  ) {}

  /** the block that could not be converted, to find its line */
  failed: any = null

  fail(message: string, node: any): never {
    this.failed = node
    throw new TextError(message)
  }

  /** scratchblocks' spec with %n/%s/%b → Scratch proccode with %s/%b */
  static proccode(call: string) {
    return call.replace(/%[nsm](\.[\w]+)?/g, '%s').replace(/%b/g, '%b')
  }

  collectProcedures(scripts: any[]) {
    for (const script of scripts) {
      const hat = script.blocks[0]
      if (hat?.info?.selector !== 'procDef') continue
      const proccode = ScriptConverter.proccode(hat.info.call)
      const names: string[] = hat.info.names || []
      this.procs.set(proccode, {
        proccode,
        argumentnames: names,
        argumentids: names.map(() => nextId('arg')),
      })
    }
  }

  script(script: any, y: number) {
    let parent: string | null = null
    let first: string | null = null
    for (const block of script.blocks) {
      if (block.isComment) continue
      const id = this.block(block, parent)
      if (parent) this.blocks[parent].next = id
      else first = id
      parent = id
    }
    if (first) {
      this.blocks[first].topLevel = true
      this.blocks[first].x = 0
      this.blocks[first].y = y
    }
  }

  private add(opcode: string, parent: string | null, extra: object = {}): string {
    const id = nextId()
    this.blocks[id] = {
      opcode,
      next: null,
      parent,
      inputs: {},
      fields: {},
      shadow: false,
      topLevel: false,
      ...extra,
    }
    return id
  }

  /**
   * Children that are arguments (inputs or nested reporters) in message order.
   * Translations may order them differently ("gehe %2 Ebenen %1").
   */
  private args(block: any) {
    const args = block.children.filter((c: any) => c.isInput || c.isBlock)
    const spec: string | undefined = block.info?.language?.commands?.[block.info.id]
    if (!spec) return args
    const order = [...spec.matchAll(/%(\d+)/g)].map((m) => Number(m[1]))
    if (order.every((n, i) => n === i + 1)) return args
    const sorted: any[] = []
    order.forEach((n, i) => (sorted[n - 1] = args[i]))
    return [...sorted, ...args.slice(order.length)]
  }

  private scripts(block: any) {
    return block.children.filter((c: any) => c.isScript)
  }

  block(block: any, parent: string | null): string {
    const info = block.info || {}

    if (info.selector === 'procDef') return this.procDefinition(block, parent)
    if (info.selector === 'call') return this.procCall(block, parent)
    if (info.selector === 'readVariable' || info.selector === 'contentsOfList:' || (!info.id && block.isReporter)) {
      return this.reporterByName(block, parent)
    }
    if (info.selector === 'getParam') return this.param(block, parent)

    let opcode = OPCODE_BY_SB[info.id]
    if (info.id === 'CONTROL_IF' && this.scripts(block).length > 1) opcode = 'control_if_else'
    if (!opcode) this.fail(this.lang.message('unknownBlock', blockText(block)), block)

    const spec = BLOCKS[opcode]
    const id = this.add(opcode, parent)
    const node = this.blocks[id]
    const args = this.args(block)

    spec.args.forEach((arg, i) => {
      const child = args[i]
      if (arg.kind === 'field') {
        node.fields[arg.name] = this.field(opcode, arg, child)
      } else {
        const input = this.input(opcode, arg, child, id)
        if (input) node.inputs[arg.name] = input
      }
    })

    this.scripts(block).forEach((script: any, i: number) => {
      const name = spec.statements[i]
      if (!name) return
      let prev: string | null = null
      let first: string | null = null
      for (const b of script.blocks) {
        const childId = this.block(b, prev ?? id)
        if (prev) this.blocks[prev].next = childId
        else first = childId
        prev = childId
      }
      if (first) node.inputs[name] = [2, first]
    })

    return id
  }

  private text(child: any): string {
    if (!child) return ''
    if (child.isInput) return String(child.value ?? '')
    if (child.isBlock) return blockText(child)
    return ''
  }

  private field(opcode: string, arg: ArgSpec, child: any): [string, string | null] {
    const raw = this.text(child)
    if (arg.variable !== undefined) {
      const type = arg.variable as '' | 'list' | 'broadcast_msg'
      const name = raw || (type === 'list' ? 'list' : 'variable')
      return [name, this.builder.variable(this.target, name, type)]
    }
    return [this.lang.menuValue(`${opcode}.${arg.name}`, raw), null]
  }

  private input(opcode: string, arg: ArgSpec, child: any, parent: string): any[] | null {
    const shadow = arg.shadow
    const primitive = shadow ? PRIMITIVES[shadow] : undefined

    const shadowValue = (value: string): any => {
      if (primitive !== undefined) return [primitive, value]
      if (shadow === 'event_broadcast_menu') {
        const name = value || 'message1'
        return [11, name, this.builder.variable(this.target, name, 'broadcast_msg')]
      }
      if (shadow) {
        const sid = this.add(shadow, parent, { shadow: true })
        if (arg.shadowField) {
          this.blocks[sid].fields[arg.shadowField] = [this.lang.menuValue(`${shadow}.${arg.shadowField}`, value), null]
        }
        return sid
      }
      return null
    }

    // nested reporter or boolean block
    if (child?.isBlock) {
      const info = child.info || {}
      const isVar = info.selector === 'readVariable' || (!info.id && child.isReporter && !info.selector)
      if (isVar && !this.params.has(blockText(child))) {
        const name = blockText(child)
        const isList = info.category === 'list' || this.builder.isList(this.target, name)
        const ref = isList
          ? [13, name, this.builder.variable(this.target, name, 'list')]
          : [12, name, this.builder.variable(this.target, name, '')]
        const obscured = shadow ? shadowValue(arg.default ?? '') : null
        return obscured === null ? [3, ref] : [3, ref, obscured]
      }
      const obscured = shadow ? shadowValue(arg.default ?? '') : null
      const cid = this.block(child, parent)
      return obscured === null ? [2, cid] : [3, cid, obscured]
    }

    if (!shadow) return null // empty boolean or c-slot

    const value = child?.isInput ? String(child.value ?? '') : arg.default ?? ''
    return [1, shadowValue(value)]
  }

  private reporterByName(block: any, parent: string | null): string {
    const name = blockText(block)
    if (this.params.has(name)) return this.param(block, parent)
    const isList = block.info?.category === 'list' || this.builder.isList(this.target, name)
    const id = this.add(isList ? 'data_listcontents' : 'data_variable', parent)
    this.blocks[id].fields[isList ? 'LIST' : 'VARIABLE'] = [
      name,
      this.builder.variable(this.target, name, isList ? 'list' : ''),
    ]
    return id
  }

  private param(block: any, parent: string | null): string {
    const name = blockText(block)
    const opcode = block.isBoolean ? 'argument_reporter_boolean' : 'argument_reporter_string_number'
    const id = this.add(opcode, parent)
    this.blocks[id].fields.VALUE = [name, null]
    return id
  }

  private procDefinition(block: any, parent: string | null): string {
    const proccode = ScriptConverter.proccode(block.info.call)
    const proc = this.procs.get(proccode)!
    const id = this.add('procedures_definition', parent)
    const proto = this.add('procedures_prototype', id, { shadow: true })
    const types = proccode.match(/%[sb]/g) || []

    proc.argumentnames.forEach((name, i) => {
      this.params.add(name)
      const opcode = types[i] === '%b' ? 'argument_reporter_boolean' : 'argument_reporter_string_number'
      const rid = this.add(opcode, proto, { shadow: true })
      this.blocks[rid].fields.VALUE = [name, null]
      this.blocks[proto].inputs[proc.argumentids[i]] = [1, rid]
    })

    this.blocks[proto].mutation = {
      tagName: 'mutation',
      children: [],
      proccode,
      argumentids: JSON.stringify(proc.argumentids),
      argumentnames: JSON.stringify(proc.argumentnames),
      argumentdefaults: JSON.stringify(types.map((t) => (t === '%b' ? 'false' : ''))),
      warp: 'false',
    }
    this.blocks[id].inputs.custom_block = [1, proto]
    return id
  }

  private procCall(block: any, parent: string | null): string {
    const proccode = ScriptConverter.proccode(block.info.call)
    const proc = this.procs.get(proccode)
    if (!proc) this.fail(this.lang.message('unknownCustomBlock', blockText(block)), block)
    const id = this.add('procedures_call', parent)
    const types = proccode.match(/%[sb]/g) || []
    const args = this.args(block)

    types.forEach((type, i) => {
      const argId = proc.argumentids[i]
      const child = args[i]
      if (type === '%b') {
        if (child?.isBlock) this.blocks[id].inputs[argId] = [2, this.block(child, id)]
      } else {
        const input = this.input('procedures_call', { name: argId, kind: 'input', shadow: 'text', default: '' }, child, id)
        if (input) this.blocks[id].inputs[argId] = input
      }
    })

    this.blocks[id].mutation = {
      tagName: 'mutation',
      children: [],
      proccode,
      argumentids: JSON.stringify(proc.argumentids),
      warp: 'false',
    }
    return id
  }
}

function blockText(block: any): string {
  return block.children
    .filter((c: any) => c.isLabel)
    .map((c: any) => c.value)
    .join(' ')
}

type AssetKind = 'costume' | 'backdrop' | 'sound'

/** Checks library keys (built-in and the course's own, see registry.ts). */
function checkAssets(keys: string[], kind: AssetKind, lang: TextLanguage, line: number) {
  const [ok, known, message]: [(key: string) => boolean, object, Key] =
    kind === 'sound'
      ? [(key) => Object.hasOwn(SOUNDS, key), SOUNDS, 'unknownSound']
      : [
          // costumes and backdrops are both images, either works for both
          (key) => Object.hasOwn(COSTUMES, key) || Object.hasOwn(BACKDROPS, key),
          kind === 'costume' ? COSTUMES : BACKDROPS,
          kind === 'costume' ? 'unknownCostume' : 'unknownBackdrop',
        ]
  for (const key of keys) {
    if (ok(key)) continue
    const error = assetError(key)
    const text = error ? lang.message('assetFailed', key, error) : lang.message(message, key, Object.keys(known).join(', '))
    throw new TextError(text, line, lang)
  }
}

function applyProps(target: any, section: Section, lang: TextLanguage) {
  for (const [prop, value, line] of section.props) {
    const fail = (message: string): never => {
      throw new TextError(message, line, lang)
    }
    const number = (v: string) => {
      const n = Number(v.trim())
      if (v.trim() === '' || !Number.isFinite(n)) fail(lang.message('notANumber', v.trim()))
      return n
    }

    const assets = (keys: string[], kind: AssetKind) => {
      checkAssets(keys, kind, lang, line)
      return keys.map((key) => ({ name: key, asset: key }))
    }

    switch (prop) {
      case 'costumes':
      case 'backdrops': {
        const entries = splitList(value)
        const current = entries.findIndex((e) => e.endsWith('*'))
        const keys = entries.map((e) => e.replace(/\*$/, '').trim())
        target.costumes = assets(keys, prop === 'costumes' ? 'costume' : 'backdrop')
        target.currentCostume = Math.max(0, current)
        break
      }
      case 'sounds':
        target.sounds = assets(splitList(value), 'sound')
        break
      case 'x':
        target.x = number(value)
        break
      case 'y':
        target.y = number(value)
        break
      case 'position': {
        const [x, y = '0'] = value.split(',')
        target.x = number(x)
        target.y = number(y)
        break
      }
      case 'direction':
        target.direction = number(value)
        break
      case 'size':
        target.size = number(value)
        break
      case 'visible':
        target.visible = lang.isYes(value)
        break
      case 'draggable':
        target.draggable = lang.isYes(value)
        break
      case 'rotation':
        target.rotationStyle = value.trim()
        break
      case 'variables':
        for (const entry of splitList(value)) {
          const [name, v = '0'] = entry.split('=').map((s) => s.trim())
          target.variables[nextId('var')] = [name, parseValue(v)]
        }
        break
      case 'lists':
        for (const entry of value.split(';')) {
          if (!entry.trim()) continue
          const eq = entry.indexOf('=')
          const name = (eq < 0 ? entry : entry.slice(0, eq)).trim()
          const items = eq < 0 ? [] : splitList(entry.slice(eq + 1)).map(parseValue)
          target.lists[nextId('list')] = [name, items]
        }
        break
      case 'monitors':
        target.__show = splitList(value)
        break
    }
  }
}

export function parseScratchText(text: string, options: TextOptions): ProjectJSON {
  idCounter = 0
  const lang = languageOf(options)
  const builder = new ProjectBuilder()
  const sections = splitSections(text, lang)
  const sprites: any[] = []

  // sections first, so variables declared anywhere are known to all scripts
  const targets = sections.map((section) => {
    if (section.kind === 'stage') {
      applyProps(builder.stage, section, lang)
      return builder.stage
    }
    let sprite = sprites.find((s) => s.name === section.name)
    if (!sprite) {
      const lib = spritePreset(section.name)
      // a preset of the course may name assets that do not exist (unless replaced)
      const has = (prop: Property) => section.props.some(([p]) => p === prop)
      if (!has('costumes')) checkAssets(lib.costumes, 'costume', lang, section.line)
      if (!has('sounds')) checkAssets(lib.sounds, 'sound', lang, section.line)
      sprite = spriteJSON(section.name, lib.costumes, lib.sounds, sprites.length + 1)
      sprites.push(sprite)
    }
    applyProps(sprite, section, lang)
    return sprite
  })

  if (!sprites.length && !sections.some((s) => s.kind === 'stage')) {
    sprites.push(defaultSpriteJSON())
  }

  sections.forEach((section, i) => {
    if (!section.code.trim()) return
    const target = targets[i]
    let doc: any
    try {
      doc = parse(section.code, { languages: lang.parseLanguages })
    } catch (e: any) {
      throw new TextError(e.message, section.codeLine, lang)
    }

    const converter = new ScriptConverter(target, builder, lang)
    converter.collectProcedures(doc.scripts)

    // scratchblocks does not report lines; map scripts to their first line
    const starts = scriptStartLines(section.code)
    let y = 0
    doc.scripts.forEach((script: any, si: number) => {
      try {
        converter.script(script, y)
      } catch (e: any) {
        const start = starts[si] ?? 0
        const offset = converter.failed ? findLine(section.code, start, blockText(converter.failed)) : 0
        throw new TextError(e.message, section.codeLine + start + offset, lang)
      }
      y += 64 + 48 * countBlocks(script)
    })
    Object.assign(target.blocks, converter.blocks)
  })

  const project: ProjectJSON = { targets: [builder.stage, ...sprites], monitors: [], extensions: [] }

  // monitors for "Anzeigen:" and the pen extension if used
  let monitorY = 5
  for (const target of project.targets) {
    for (const name of target.__show || []) {
      // a variable of that name, else a list
      const scopeOf = (kind: 'variables' | 'lists') =>
        [target, builder.stage].find((t) => Object.values<any>(t[kind]).some((v) => v[0] === name))
      const kind = scopeOf('variables') ? 'variables' : 'lists'
      const scope = scopeOf(kind)
      if (!scope) throw new TextError(lang.message('unknownVariable', name))
      const [id] = Object.entries<any>(scope[kind]).find(([, v]) => v[0] === name)!
      const common = { id, spriteName: scope.isStage ? null : scope.name, width: 0, height: 0, x: 5, y: monitorY, visible: true }
      project.monitors!.push(
        kind === 'variables'
          ? { ...common, mode: 'default', opcode: 'data_variable', params: { VARIABLE: name }, value: 0, sliderMin: 0, sliderMax: 100, isDiscrete: true }
          : { ...common, mode: 'list', opcode: 'data_listcontents', params: { LIST: name }, value: [] }
      )
      monitorY += 27
    }
    delete target.__show
    if (Object.values<any>(target.blocks).some((b) => b.opcode.startsWith('pen_'))) {
      if (!project.extensions!.includes('pen')) project.extensions!.push('pen')
    }
  }

  return expandProject(project)
}

function scriptStartLines(code: string): number[] {
  const starts: number[] = []
  let inScript = false
  code.split('\n').forEach((line, i) => {
    const blank = line.trim() === ''
    if (!blank && !inScript) starts.push(i)
    inScript = !blank
  })
  return starts
}

function countBlocks(script: any): number {
  let n = 0
  const walk = (b: any) => {
    n++
    b.children?.forEach((c: any) => c.isScript && c.blocks.forEach(walk))
  }
  script.blocks.forEach(walk)
  return n
}

/** offset (from `start`) of the first line containing the words of `text` */
function findLine(code: string, start: number, text: string): number {
  const norm = (v: string) => v.replace(/[\[\]()<>]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase()
  const needle = norm(text)
  const lines = code.split('\n')
  for (let i = start; i < lines.length; i++) {
    if (needle && norm(lines[i]).includes(needle)) return i - start
  }
  return 0
}

// ---------------------------------------------------------------------------
// writing
// ---------------------------------------------------------------------------

function escape(value: string) {
  return String(value).replace(/([\[\]()<>\\])/g, '\\$1')
}

class ScriptWriter {
  constructor(
    readonly target: any,
    readonly lang: TextLanguage
  ) {}

  get blocks() {
    return this.target.blocks
  }

  unsupported(what: string): never {
    throw new Error(`cannot be written as text: ${what}`)
  }

  stack(id: string | null, indent: string, out: string[]) {
    while (id) {
      const block = this.blocks[id]
      this.statement(block, indent, out)
      id = block.next
    }
  }

  private statement(block: any, indent: string, out: string[]) {
    if (block.opcode === 'procedures_definition') {
      out.push(indent + this.definition(block))
      return
    }
    out.push(indent + this.inline(block))
    const spec = BLOCKS[block.opcode]
    if (!spec?.statements.length) return
    spec.statements.forEach((name, i) => {
      if (i > 0) out.push(indent + this.lang.words.else)
      this.stack(this.blocks[block.inputs[name]?.[1]] ? block.inputs[name][1] : null, indent + '  ', out)
    })
    out.push(indent + this.lang.words.end)
  }

  private definition(block: any): string {
    const proto = this.blocks[block.inputs.custom_block[1]]
    const m = proto.mutation
    if (m.warp === 'true' || m.warp === true) this.unsupported('custom block without screen refresh')
    const names: string[] = JSON.parse(m.argumentnames)
    let i = 0
    const text = m.proccode.replace(/%[sb]/g, (t: string) => {
      const name = escape(names[i++])
      return t === '%b' ? `<${name}>` : `(${name})`
    })
    const { define, defineSuffix } = this.lang.words
    return [define, text, defineSuffix].filter(Boolean).join(' ')
  }

  /** a block as text, without its substacks */
  inline(block: any): string {
    const op = block.opcode

    if (op === 'data_variable') return escape(block.fields.VARIABLE[0])
    if (op === 'data_listcontents') return `${escape(block.fields.LIST[0])} :: list`
    if (op === 'argument_reporter_string_number' || op === 'argument_reporter_boolean') {
      return escape(block.fields.VALUE[0])
    }
    if (op === 'procedures_call') return this.call(block)

    const spec = BLOCKS[op]
    if (!spec) this.unsupported(op)
    const fill = (text: string, english: boolean) => {
      const args = spec.args.map((arg) => this.arg(op, arg, block, english))
      return text.replace(/%(\d+)/g, (_, n) => args[Number(n) - 1] ?? '')
    }
    const line = fill(this.lang.specText(spec.sb), false)
    if (this.lang.code === 'en' || this.lang.readsAs(line, spec.sb)) return line
    // ambiguous or unreadable in this language: English is always understood
    return fill(this.lang.englishSpecText(spec.sb), true)
  }

  private call(block: any): string {
    const m = block.mutation
    const ids: string[] = JSON.parse(m.argumentids)
    let i = 0
    return m.proccode.replace(/%[sb]/g, (t: string) => {
      const input = block.inputs[ids[i++]]
      if (t === '%b') return this.wrap(input ? this.blocks[input[1]] : null, 'boolean')
      return this.inputText({ name: '', kind: 'input', shadow: 'text' }, input)
    })
  }

  private wrap(block: any, shape: 'boolean' | 'reporter') {
    if (!block) return shape === 'boolean' ? '<>' : '()'
    const text = this.inline(block)
    const boolean =
      block.opcode === 'argument_reporter_boolean' || BLOCKS[block.opcode]?.shape === 'boolean'
    return boolean ? `<${text}>` : `(${text})`
  }

  private arg(opcode: string, arg: ArgSpec, block: any, english = false): string {
    if (arg.kind === 'field') {
      const [value] = block.fields[arg.name] ?? ['']
      const key = `${opcode}.${arg.name}`
      return `[${escape(english ? this.lang.englishMenuText(key, value) : this.lang.menuText(key, value))} v]`
    }
    return this.inputText(arg, block.inputs[arg.name], english)
  }

  private inputText(arg: ArgSpec, input: any[] | undefined, english = false): string {
    if (!input) return arg.shadow ? this.primitiveText(arg, '') : '<>'
    const [, value] = input

    // [1, primitive] / [1, shadowId] / [2|3, blockId|variable, shadow]
    if (input[0] === 1) {
      if (Array.isArray(value)) return this.compact(arg, value)
      return this.menuText(this.blocks[value], english)
    }
    if (Array.isArray(value)) return this.compact(arg, value)
    return this.wrap(this.blocks[value], 'reporter')
  }

  private compact(arg: ArgSpec, value: any[]): string {
    const [type, v] = value
    if (type === 12) return `(${escape(v)})`
    if (type === 13) return `(${escape(v)} :: list)`
    if (type === 11) return `[${escape(v)} v]`
    const shadow = PRIMITIVE_TYPES[type] ?? arg.shadow
    return this.primitiveText({ ...arg, shadow }, String(v))
  }

  private primitiveText(arg: ArgSpec, value: string): string {
    // like scratchblocks: numbers are round, even in text inputs ("set [x v] to (0)")
    if (arg.shadow === 'text' && !isNumeric(value)) return `[${escape(value)}]`
    if (arg.shadow === 'colour_picker') return `[${value}]`
    return `(${escape(value)})`
  }

  private menuText(shadow: any, english = false): string {
    if (!shadow) return '()'
    const [fieldName] = Object.keys(shadow.fields)
    const [value] = shadow.fields[fieldName] ?? ['']
    const key = `${shadow.opcode}.${fieldName}`
    return `(${escape(english ? this.lang.englishMenuText(key, value) : this.lang.menuText(key, value))} v)`
  }
}

function isNumeric(v: string) {
  return v.trim() !== '' && Number.isFinite(Number(v))
}

function sameList(a: string[], b: string[]) {
  return a.length === b.length && a.every((v, i) => v === b[i])
}

function assetKeys(assets: any[], what: string): string[] {
  return assets.map((a) => {
    // by name first: several keys may share the same image (and md5)
    const key = a.asset ?? (libraryIds.byKey.get(a.name) === a.assetId ? a.name : libraryIds.byMd5.get(a.assetId))
    if (!key || a.name !== key) throw new Error(`cannot be written as text: ${what} ${a.name}`)
    return key
  })
}

function formatValue(v: any): string {
  const s = String(v)
  if (/[,;=*]/.test(s)) throw new Error(`cannot be written as text: value ${s}`)
  return s
}

/** "robo-a, robo-b*" — the star marks the current costume (if not the first) */
function costumeList(keys: string[], current: number) {
  return keys.map((k, i) => (i === current && current > 0 ? `${k}*` : k)).join(', ')
}

function propertyLines(target: any, lang: TextLanguage, monitors: string[]): string[] {
  const key = (id: Property) => lang.word(id)
  const lines: string[] = []
  const lib = spritePreset(target.name)
  const words = lang.words

  if (target.isStage) {
    const backdrops = assetKeys(target.costumes, 'backdrop')
    if (!sameList(backdrops, [DEFAULT_BACKDROP]) || target.currentCostume) {
      lines.push(`${key('backdrops')}: ${costumeList(backdrops, target.currentCostume)}`)
    }
    if (target.sounds.length) lines.push(`${key('sounds')}: ${assetKeys(target.sounds, 'sound').join(', ')}`)
  } else {
    const costumes = assetKeys(target.costumes, 'costume')
    if (!sameList(costumes, lib.costumes) || target.currentCostume) {
      lines.push(`${key('costumes')}: ${costumeList(costumes, target.currentCostume)}`)
    }
    const sounds = assetKeys(target.sounds, 'sound')
    if (!sameList(sounds, lib.sounds)) lines.push(`${key('sounds')}: ${sounds.join(', ')}`)
    if (target.x) lines.push(`x: ${round(target.x)}`)
    if (target.y) lines.push(`y: ${round(target.y)}`)
    if (target.direction !== 90) lines.push(`${key('direction')}: ${round(target.direction)}`)
    if (target.size !== 100) lines.push(`${key('size')}: ${round(target.size)}`)
    if (target.visible === false) lines.push(`${key('visible')}: ${words.no}`)
    if (target.draggable) lines.push(`${key('draggable')}: ${words.yes}`)
    if (target.rotationStyle && target.rotationStyle !== 'all around') {
      lines.push(`${key('rotation')}: ${target.rotationStyle}`)
    }
  }

  const vars = Object.values<any>(target.variables || {})
  if (vars.some((v) => v[2])) throw new Error('cannot be written as text: cloud variable')
  if (vars.length) {
    lines.push(`${key('variables')}: ${vars.map((v) => `${formatValue(v[0])} = ${formatValue(v[1])}`).join(', ')}`)
  }
  const lists = Object.values<any>(target.lists || {})
  if (lists.length) {
    lines.push(
      `${key('lists')}: ${lists
        .map((l) => `${formatValue(l[0])} = ${(l[1] as any[]).map(formatValue).join(', ')}`.trimEnd())
        .join('; ')}`
    )
  }
  if (monitors.length) lines.push(`${key('monitors')}: ${monitors.join(', ')}`)
  return lines
}

function round(n: number) {
  return Math.round(n * 100) / 100
}

export function stringifyScratchText(project: ProjectJSON, options: TextOptions): string {
  const lang = languageOf(options)
  const stage = project.targets.find((t) => t.isStage)
  const sprites = project.targets.filter((t) => !t.isStage).sort((a, b) => (a.layerOrder ?? 0) - (b.layerOrder ?? 0))

  const unsupportedExt = (project.extensions || []).filter((e) => e !== 'pen')
  if (unsupportedExt.length) throw new Error(`cannot be written as text: extension ${unsupportedExt.join(', ')}`)

  const visibleMonitors = (project.monitors || []).filter((m: any) => m.visible)
  const monitorsOf = (target: any) =>
    visibleMonitors
      .filter((m: any) => (target.isStage ? !m.spriteName : m.spriteName === target.name))
      .map((m: any) => (m.opcode === 'data_variable' ? m.params.VARIABLE : m.params.LIST))
  for (const m of visibleMonitors) {
    if (m.opcode === 'data_variable') continue
    if (m.opcode !== 'data_listcontents') throw new Error('cannot be written as text: sensing monitor')
    // "monitors:" names a variable before a list of the same name
    const scopes = [project.targets.find((t) => !t.isStage && t.name === m.spriteName), stage].filter(Boolean)
    if (scopes.some((t: any) => Object.values<any>(t.variables || {}).some((v) => v[0] === m.params.LIST))) {
      throw new Error(`cannot be written as text: monitor of list ${m.params.LIST}, a variable has the same name`)
    }
  }

  const sections = [stage, ...sprites].map((target) => {
    const writer = new ScriptWriter(target, lang)
    const tops = Object.entries<any>(target.blocks)
      .filter(([, b]) => b.topLevel && !b.shadow)
      .sort(([, a], [, b]) => (a.y ?? 0) - (b.y ?? 0) || (a.x ?? 0) - (b.x ?? 0))
    const scripts = tops.map(([id]) => {
      const out: string[] = []
      writer.stack(id, '', out)
      return out.join('\n')
    })
    if (Object.values<any>(target.comments || {}).length) throw new Error('cannot be written as text: comments')
    return { target, props: propertyLines(target, lang, monitorsOf(target)), scripts }
  })

  const [stageSection, ...spriteSections] = sections
  const lib = SPRITES[DEFAULT_SPRITE]
  const headless =
    spriteSections.length === 1 &&
    spriteSections[0].target.name === lib.name &&
    spriteSections[0].props.length === 0 &&
    stageSection.props.length === 0 &&
    stageSection.scripts.length === 0

  if (headless) return spriteSections[0].scripts.join('\n\n')

  const parts: string[] = []
  const emit = (header: string, section: (typeof sections)[number]) => {
    const block = [header, ...section.props]
    parts.push([block.join('\n'), ...section.scripts].join('\n\n'))
  }
  if (stageSection.props.length || stageSection.scripts.length || !spriteSections.length) {
    emit(`[${lang.word('stage')}]`, stageSection)
  }
  for (const section of spriteSections) emit(`[${lang.word('sprite')} ${section.target.name}]`, section)
  return parts.join('\n\n')
}
